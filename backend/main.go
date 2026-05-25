package main

import (
	"bytes"
	"crypto/rand"
	"crypto/sha512"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type PaymentRequest struct {
	ConsultationID string `json:"consultationId"`
	ClientID       string `json:"clientId"`
	Method         string `json:"method"`
	Amount         int    `json:"amount"`
}

type RegisterRequest struct {
	FullName string `json:"fullName"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type StatusUpdateRequest struct {
	ConsultationID string `json:"consultationId"`
	ActorID        string `json:"actorId"`
	Status         string `json:"status"`
	Note           string `json:"note"`
}

type AdminRequest struct {
	Action       string `json:"action"`
	LawyerUserID string `json:"lawyerUserId"`
	ClientID     string `json:"clientId"`
	TicketID     string `json:"ticketId"`
	PaymentID    string `json:"paymentId"`
	Status       string `json:"status"`
	Response     string `json:"response"`
}

type MidtransSnapResponse struct {
	Token       string `json:"token"`
	RedirectURL string `json:"redirect_url"`
}

type MidtransNotification struct {
	OrderID           string `json:"order_id"`
	StatusCode        string `json:"status_code"`
	GrossAmount       string `json:"gross_amount"`
	SignatureKey      string `json:"signature_key"`
	TransactionStatus string `json:"transaction_status"`
	FraudStatus       string `json:"fraud_status"`
	PaymentType       string `json:"payment_type"`
	TransactionID     string `json:"transaction_id"`
}

type SupabaseConsultation struct {
	ID       string `json:"id"`
	ClientID string `json:"client_id"`
	LawyerID string `json:"lawyer_id"`
	Price    int    `json:"price"`
	Status   string `json:"status"`
}

type SupabaseProfile struct {
	ID       string `json:"id"`
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
}

type SupabasePayment struct {
	ID                string `json:"id"`
	ConsultationID    string `json:"consultation_id"`
	ClientID          string `json:"client_id"`
	Amount            int    `json:"amount"`
	AdminFee          int    `json:"admin_fee"`
	TaxAmount         int    `json:"tax_amount"`
	PlatformFee       int    `json:"platform_fee"`
	TotalAmount       int    `json:"total_amount"`
	Method            string `json:"method"`
	Provider          string `json:"provider"`
	Status            string `json:"status"`
	ExternalReference string `json:"external_reference"`
}

type SupabaseStatusRow struct {
	Status string `json:"status"`
}

type SupabaseAuthUserResponse struct {
	User struct {
		ID    string `json:"id"`
		Email string `json:"email"`
	} `json:"user"`
}

type SupabaseAuthUser struct {
	ID string `json:"id"`
}

func loadEnvFile(path string) {
	content, err := os.ReadFile(path)
	if err != nil {
		return
	}

	for _, line := range strings.Split(string(content), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") || !strings.Contains(line, "=") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		key := strings.TrimSpace(parts[0])
		value := strings.Trim(strings.TrimSpace(parts[1]), `"'`)
		if key != "" && os.Getenv(key) == "" {
			os.Setenv(key, value)
		}
	}
}

func loadLocalEnv() {
	loadEnvFile(filepath.Join("..", ".env"))
	loadEnvFile(".env")
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func newID(prefix string) (string, error) {
	b := make([]byte, 12)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return prefix + "-" + hex.EncodeToString(b), nil
}

func supabaseURL() string {
	value := strings.TrimRight(os.Getenv("VITE_SUPABASE_URL"), "/")
	if value == "" {
		value = strings.TrimRight(os.Getenv("SUPABASE_URL"), "/")
	}
	return value
}

func supabaseServiceKey() string {
	return os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
}

func supabaseREST(method, path string, payload interface{}, out interface{}) error {
	baseURL := supabaseURL()
	serviceKey := supabaseServiceKey()
	if baseURL == "" || serviceKey == "" {
		return fmt.Errorf("Supabase backend belum lengkap. Isi VITE_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env")
	}

	var body io.Reader
	if payload != nil {
		data, err := json.Marshal(payload)
		if err != nil {
			return err
		}
		body = bytes.NewReader(data)
	}

	request, err := http.NewRequest(method, baseURL+"/rest/v1/"+path, body)
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", "Bearer "+serviceKey)
	request.Header.Set("apikey", serviceKey)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Accept", "application/json")
	if method == http.MethodPost || method == http.MethodPatch {
		if strings.Contains(path, "on_conflict=") {
			request.Header.Set("Prefer", "return=representation,resolution=merge-duplicates")
		} else {
			request.Header.Set("Prefer", "return=representation")
		}
	}

	client := &http.Client{Timeout: 20 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		return err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return fmt.Errorf("Supabase REST error %d: %s", response.StatusCode, strings.TrimSpace(string(responseBody)))
	}
	if out != nil && len(responseBody) > 0 {
		if err := json.Unmarshal(responseBody, out); err != nil {
			return err
		}
	}
	return nil
}

func queryEscape(value string) string {
	return url.QueryEscape(strings.TrimSpace(value))
}

func requireAdmin(r *http.Request) (string, error) {
	header := r.Header.Get("Authorization")
	if !strings.HasPrefix(strings.ToLower(header), "bearer ") {
		return "", fmt.Errorf("sesi admin tidak valid")
	}
	token := strings.TrimSpace(header[7:])
	baseURL := supabaseURL()
	serviceKey := supabaseServiceKey()
	if token == "" || baseURL == "" || serviceKey == "" {
		return "", fmt.Errorf("sesi admin tidak valid")
	}

	request, err := http.NewRequest(http.MethodGet, baseURL+"/auth/v1/user", nil)
	if err != nil {
		return "", err
	}
	request.Header.Set("Authorization", "Bearer "+token)
	request.Header.Set("apikey", serviceKey)
	request.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 20 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return "", err
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		return "", err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return "", fmt.Errorf("sesi admin tidak valid")
	}

	var authUser SupabaseAuthUser
	if err := json.Unmarshal(responseBody, &authUser); err != nil || authUser.ID == "" {
		return "", fmt.Errorf("sesi admin tidak valid")
	}

	var profiles []map[string]interface{}
	if err := supabaseREST(http.MethodGet, "profiles?id=eq."+queryEscape(authUser.ID)+"&select=id,role,status", nil, &profiles); err != nil {
		return "", err
	}
	if len(profiles) == 0 || profiles[0]["role"] != "admin" || profiles[0]["status"] != "active" {
		return "", fmt.Errorf("akses admin ditolak")
	}
	return authUser.ID, nil
}

func midtransProduction() bool {
	return strings.EqualFold(os.Getenv("MIDTRANS_IS_PRODUCTION"), "true")
}

func midtransSnapURL() string {
	if midtransProduction() {
		return "https://app.midtrans.com/snap/v1/transactions"
	}
	return "https://app.sandbox.midtrans.com/snap/v1/transactions"
}

func midtransSnapJSURL() string {
	if midtransProduction() {
		return "https://app.midtrans.com/snap/snap.js"
	}
	return "https://app.sandbox.midtrans.com/snap/snap.js"
}

func normalizePaymentMethod(method string) string {
	method = strings.ToLower(strings.TrimSpace(method))
	switch method {
	case "wallet", "ewallet", "qris":
		return "ewallet"
	case "card", "credit_card":
		return "credit_card"
	default:
		return "bank_transfer"
	}
}

func midtransEnabledPayments(method string) []string {
	switch method {
	case "bank_transfer":
		return []string{"bca_va", "bni_va", "bri_va", "permata_va", "echannel"}
	case "ewallet":
		return []string{"gopay", "shopeepay", "qris"}
	case "credit_card":
		return []string{"credit_card"}
	default:
		return []string{}
	}
}

func createMidtransSnapToken(orderID string, amount int, method string, customer map[string]string) (*MidtransSnapResponse, error) {
	serverKey := os.Getenv("MIDTRANS_SERVER_KEY")
	if strings.TrimSpace(serverKey) == "" {
		return nil, fmt.Errorf("MIDTRANS_SERVER_KEY belum diatur di environment backend")
	}

	payload := map[string]interface{}{
		"transaction_details": map[string]interface{}{
			"order_id":     orderID,
			"gross_amount": amount,
		},
		"customer_details": customer,
		"item_details": []map[string]interface{}{
			{
				"id":       orderID,
				"price":    amount,
				"quantity": 1,
				"name":     "Konsultasi hukum FINPROSE",
			},
		},
		"credit_card": map[string]interface{}{
			"secure": true,
		},
		"callbacks": map[string]string{
			"finish": "http://localhost:3000/",
		},
	}
	if enabled := midtransEnabledPayments(method); len(enabled) > 0 {
		payload["enabled_payments"] = enabled
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	request, err := http.NewRequest(http.MethodPost, midtransSnapURL(), bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Basic "+base64.StdEncoding.EncodeToString([]byte(serverKey+":")))

	client := &http.Client{Timeout: 20 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("Midtrans menolak transaksi: %s", strings.TrimSpace(string(responseBody)))
	}

	var snap MidtransSnapResponse
	if err := json.Unmarshal(responseBody, &snap); err != nil {
		return nil, err
	}
	if snap.Token == "" {
		return nil, fmt.Errorf("Midtrans tidak mengembalikan Snap token")
	}
	return &snap, nil
}

func verifyMidtransSignature(notification MidtransNotification) bool {
	serverKey := os.Getenv("MIDTRANS_SERVER_KEY")
	if serverKey == "" || notification.SignatureKey == "" {
		return false
	}
	sum := sha512.Sum512([]byte(notification.OrderID + notification.StatusCode + notification.GrossAmount + serverKey))
	return hex.EncodeToString(sum[:]) == notification.SignatureKey
}

func mapMidtransStatus(notification MidtransNotification) string {
	switch notification.TransactionStatus {
	case "capture":
		if notification.FraudStatus == "" || strings.EqualFold(notification.FraudStatus, "accept") {
			return "paid"
		}
		return "pending"
	case "settlement":
		return "paid"
	case "pending":
		return "pending"
	case "deny", "cancel", "failure":
		return "failed"
	case "expire":
		return "expired"
	default:
		return "pending"
	}
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "success",
		"message": "FINPROSE backend is running with Supabase runtime.",
	})
}

func isLikelyEmail(email string) bool {
	if strings.Count(email, "@") != 1 {
		return false
	}

	parts := strings.Split(email, "@")
	return strings.TrimSpace(parts[0]) != "" && strings.Contains(parts[1], ".")
}

func normalizeRole(role string) string {
	if role == "lawyer" {
		return "lawyer"
	}
	return "client"
}

func createAuthUser(req RegisterRequest) (*SupabaseAuthUserResponse, error) {
	baseURL := supabaseURL()
	serviceKey := supabaseServiceKey()
	if baseURL == "" || serviceKey == "" {
		return nil, fmt.Errorf("Supabase backend belum lengkap. Isi VITE_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env")
	}

	payload := map[string]interface{}{
		"email":         req.Email,
		"password":      req.Password,
		"email_confirm": true,
		"user_metadata": map[string]string{
			"full_name": req.FullName,
			"role":      req.Role,
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	request, err := http.NewRequest(http.MethodPost, baseURL+"/auth/v1/admin/users", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	request.Header.Set("Authorization", "Bearer "+serviceKey)
	request.Header.Set("apikey", serviceKey)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 20 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("%s", strings.TrimSpace(string(responseBody)))
	}

	var userResponse SupabaseAuthUserResponse
	if err := json.Unmarshal(responseBody, &userResponse.User); err == nil && userResponse.User.ID != "" {
		return &userResponse, nil
	}
	if err := json.Unmarshal(responseBody, &userResponse); err != nil {
		return nil, err
	}
	return &userResponse, nil
}

func registerHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	req.FullName = strings.TrimSpace(req.FullName)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.Role = normalizeRole(req.Role)

	if req.FullName == "" || req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "Nama, email, dan kata sandi wajib diisi.")
		return
	}
	if !isLikelyEmail(req.Email) {
		writeError(w, http.StatusBadRequest, "Format email belum valid.")
		return
	}
	if len(req.Password) < 8 {
		writeError(w, http.StatusBadRequest, "Kata sandi minimal 8 karakter.")
		return
	}

	authUser, err := createAuthUser(req)
	if err != nil {
		message := err.Error()
		if strings.Contains(strings.ToLower(message), "already") {
			writeError(w, http.StatusConflict, "Email sudah terdaftar. Silakan login.")
			return
		}
		writeError(w, http.StatusBadGateway, message)
		return
	}
	if authUser.User.ID == "" {
		writeError(w, http.StatusBadGateway, "Supabase tidak mengembalikan user baru.")
		return
	}

	status := "active"
	if req.Role == "lawyer" {
		status = "pending_verification"
	}
	profilePayload := map[string]interface{}{
		"id":        authUser.User.ID,
		"full_name": req.FullName,
		"email":     req.Email,
		"role":      req.Role,
		"status":    status,
	}
	if err := supabaseREST(http.MethodPost, "profiles?on_conflict=id", profilePayload, nil); err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}

	if req.Role == "lawyer" {
		lawyerPayload := map[string]interface{}{
			"user_id":             authUser.User.ID,
			"specialty":           "Belum diisi",
			"description":         "Profil advokat sedang menunggu verifikasi admin.",
			"experience_years":    0,
			"consultation_price":  150000,
			"verification_status": "pending",
		}
		if err := supabaseREST(http.MethodPost, "lawyer_profiles?on_conflict=user_id", lawyerPayload, nil); err != nil {
			writeError(w, http.StatusBadGateway, err.Error())
			return
		}
	} else {
		if err := supabaseREST(http.MethodPost, "client_profiles?on_conflict=user_id", map[string]string{"user_id": authUser.User.ID}, nil); err != nil {
			writeError(w, http.StatusBadGateway, err.Error())
			return
		}
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"user": map[string]string{
			"id":    authUser.User.ID,
			"email": req.Email,
		},
		"role":   req.Role,
		"status": status,
	})
}

func createPaymentHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req PaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	if req.ConsultationID == "" || req.ClientID == "" {
		writeError(w, http.StatusBadRequest, "Consultation ID dan Client ID wajib tersedia")
		return
	}

	var consultations []SupabaseConsultation
	if err := supabaseREST(http.MethodGet, "app_consultations?id=eq."+req.ConsultationID+"&select=id,client_id,lawyer_id,price,status", nil, &consultations); err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	if len(consultations) == 0 {
		writeError(w, http.StatusNotFound, "Konsultasi tidak ditemukan")
		return
	}

	consultation := consultations[0]
	if consultation.ClientID != "" && consultation.ClientID != req.ClientID {
		writeError(w, http.StatusForbidden, "Konsultasi bukan milik user ini")
		return
	}

	amount := consultation.Price
	if req.Amount > 0 {
		amount = req.Amount
	}

	adminFee := 5000
	taxAmount := int(float64(amount) * 0.11)
	platformFee := int(float64(amount) * 0.10)
	total := amount + adminFee + taxAmount
	method := normalizePaymentMethod(req.Method)

	paymentRef, err := newID("PAY")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Gagal membuat ID pembayaran")
		return
	}

	customerName := "Klien FINPROSE"
	customerEmail := "client@finprose.local"
	customerPhone := ""
	var profiles []SupabaseProfile
	if err := supabaseREST(http.MethodGet, "profiles?id=eq."+req.ClientID+"&select=id,full_name,email,phone", nil, &profiles); err == nil && len(profiles) > 0 {
		customerName = profiles[0].FullName
		customerEmail = profiles[0].Email
		customerPhone = profiles[0].Phone
	}

	customer := map[string]string{
		"first_name": customerName,
		"email":      customerEmail,
	}
	if strings.TrimSpace(customerPhone) != "" {
		customer["phone"] = customerPhone
	}

	snap, err := createMidtransSnapToken(paymentRef, total, method, customer)
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}

	paymentPayload := map[string]interface{}{
		"consultation_id":    req.ConsultationID,
		"client_id":          req.ClientID,
		"amount":             amount,
		"admin_fee":          adminFee,
		"tax_amount":         taxAmount,
		"platform_fee":       platformFee,
		"total_amount":       total,
		"method":             method,
		"provider":           "Midtrans Snap",
		"status":             "pending",
		"external_reference": paymentRef,
	}
	var insertedPayments []SupabasePayment
	if err := supabaseREST(http.MethodPost, "app_payments", paymentPayload, &insertedPayments); err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	_ = supabaseREST(http.MethodPatch, "app_consultations?id=eq."+req.ConsultationID, map[string]string{"status": "pending"}, nil)

	paymentID := paymentRef
	if len(insertedPayments) > 0 && insertedPayments[0].ID != "" {
		paymentID = insertedPayments[0].ID
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"id":             paymentID,
		"paymentId":      paymentID,
		"consultationId": req.ConsultationID,
		"status":         "pending",
		"amount":         amount,
		"adminFee":       adminFee,
		"taxAmount":      taxAmount,
		"platformFee":    platformFee,
		"totalAmount":    total,
		"provider":       "midtrans",
		"snapToken":      snap.Token,
		"redirectUrl":    snap.RedirectURL,
		"clientKey":      os.Getenv("MIDTRANS_CLIENT_KEY"),
		"snapJsUrl":      midtransSnapJSURL(),
		"isProduction":   midtransProduction(),
		"lawyerId":       consultation.LawyerID,
	})
}

func lawyerConsultationsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	lawyerID := strings.TrimSpace(r.URL.Query().Get("lawyerId"))
	if lawyerID == "" {
		writeError(w, http.StatusBadRequest, "Lawyer ID wajib tersedia")
		return
	}

	path := "app_consultations?lawyer_id=eq." + lawyerID + "&select=id,client_id,lawyer_id,consultation_type,scheduled_day,scheduled_time,status,price,notes,created_at,lawyer_directory(name,specialty,image),profiles(full_name,email),app_payments(id,status,total_amount,method,paid_at,created_at)&order=created_at.desc"
	var consultations []map[string]interface{}
	if err := supabaseREST(http.MethodGet, path, nil, &consultations); err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, consultations)
}

func updateConsultationStatusHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req StatusUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	req.ConsultationID = strings.TrimSpace(req.ConsultationID)
	req.Status = strings.TrimSpace(req.Status)
	if req.ConsultationID == "" || req.Status == "" {
		writeError(w, http.StatusBadRequest, "Consultation ID dan status wajib tersedia")
		return
	}

	allowed := map[string]bool{
		"pending": true, "paid": true, "ongoing": true, "in_review": true,
		"completed": true, "cancelled": true, "expired": true,
	}
	if !allowed[req.Status] {
		writeError(w, http.StatusBadRequest, "Status konsultasi tidak valid")
		return
	}

	var existing []SupabaseStatusRow
	_ = supabaseREST(http.MethodGet, "app_consultations?id=eq."+req.ConsultationID+"&select=status", nil, &existing)

	if err := supabaseREST(http.MethodPatch, "app_consultations?id=eq."+req.ConsultationID, map[string]string{"status": req.Status}, nil); err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}

	oldStatus := ""
	if len(existing) > 0 {
		oldStatus = existing[0].Status
	}
	logPayload := map[string]interface{}{
		"consultation_id": req.ConsultationID,
		"actor_id":        nil,
		"old_status":      oldStatus,
		"new_status":      req.Status,
		"note":            req.Note,
	}
	if strings.TrimSpace(req.ActorID) != "" {
		logPayload["actor_id"] = req.ActorID
	}
	_ = supabaseREST(http.MethodPost, "consultation_status_logs", logPayload, nil)

	writeJSON(w, http.StatusOK, map[string]string{
		"status":         "success",
		"consultationId": req.ConsultationID,
		"newStatus":      req.Status,
	})
}

func valueOr(value interface{}, fallback interface{}) interface{} {
	if value == nil || value == "" {
		return fallback
	}
	return value
}

func verifyLawyerAdmin(lawyerUserID string) error {
	var profiles []map[string]interface{}
	if err := supabaseREST(http.MethodGet, "profiles?id=eq."+queryEscape(lawyerUserID)+"&select=id,full_name,email,avatar_url", nil, &profiles); err != nil {
		return err
	}
	if len(profiles) == 0 {
		return fmt.Errorf("profil advokat tidak ditemukan")
	}
	profile := profiles[0]

	var lawyerProfiles []map[string]interface{}
	_ = supabaseREST(http.MethodGet, "lawyer_profiles?user_id=eq."+queryEscape(lawyerUserID)+"&select=specialty,description,experience_years,consultation_price", nil, &lawyerProfiles)
	lawyerProfile := map[string]interface{}{}
	if len(lawyerProfiles) > 0 {
		lawyerProfile = lawyerProfiles[0]
	}

	if err := supabaseREST(http.MethodPatch, "profiles?id=eq."+queryEscape(lawyerUserID), map[string]string{"status": "active"}, nil); err != nil {
		return err
	}
	if err := supabaseREST(http.MethodPatch, "lawyer_profiles?user_id=eq."+queryEscape(lawyerUserID), map[string]string{"verification_status": "verified"}, nil); err != nil {
		return err
	}

	payload := map[string]interface{}{
		"id":                  lawyerUserID,
		"name":                profile["full_name"],
		"specialty":           valueOr(lawyerProfile["specialty"], "Belum diisi"),
		"description":         valueOr(lawyerProfile["description"], "Advokat FINPROSE terverifikasi."),
		"experience_years":    valueOr(lawyerProfile["experience_years"], 0),
		"consultation_price":  valueOr(lawyerProfile["consultation_price"], 150000),
		"image":               valueOr(profile["avatar_url"], "/lawyer1.png"),
		"verification_status": "verified",
		"languages":           []string{"Bahasa Indonesia"},
		"education":           []string{},
		"certifications":      []string{"Dokumen verifikasi disetujui admin"},
		"availability": []map[string]interface{}{
			{"day": "Senin", "times": []string{"09:00", "11:00", "14:00"}},
			{"day": "Rabu", "times": []string{"10:00", "13:00", "15:00"}},
		},
	}
	return supabaseREST(http.MethodPost, "lawyer_directory?on_conflict=id", payload, nil)
}

func updatePaymentStatusAdmin(paymentID, status string) error {
	patch := map[string]interface{}{"status": status}
	if status == "paid" {
		patch["paid_at"] = time.Now().Format(time.RFC3339)
	}
	var payments []SupabasePayment
	if err := supabaseREST(http.MethodPatch, "app_payments?id=eq."+queryEscape(paymentID), patch, &payments); err != nil {
		return err
	}
	if len(payments) == 0 || payments[0].ConsultationID == "" {
		return nil
	}
	consultationStatus := ""
	if status == "paid" {
		consultationStatus = "paid"
	} else if status == "failed" || status == "expired" {
		consultationStatus = "cancelled"
	}
	if consultationStatus != "" {
		return supabaseREST(http.MethodPatch, "app_consultations?id=eq."+queryEscape(payments[0].ConsultationID), map[string]string{"status": consultationStatus}, nil)
	}
	return nil
}

func adminHandler(w http.ResponseWriter, r *http.Request) {
	adminID, err := requireAdmin(r)
	if err != nil {
		writeError(w, http.StatusForbidden, err.Error())
		return
	}

	if r.Method == http.MethodGet {
		paths := map[string]string{
			"pending-lawyers": "lawyer_profiles?verification_status=in.(pending,rejected,suspended)&select=user_id,specialty,description,experience_years,consultation_price,verification_status,profiles(full_name,email,status,avatar_url)&order=verification_status.asc",
			"transactions":    "app_payments?select=id,consultation_id,client_id,amount,admin_fee,tax_amount,platform_fee,total_amount,method,provider,status,external_reference,created_at,paid_at,profiles(full_name,email),app_consultations(lawyer_id,consultation_type,status,lawyer_directory(name,specialty))&order=created_at.desc&limit=50",
			"clients":         "profiles?role=eq.client&select=id,full_name,email,phone,role,status,created_at&order=created_at.desc&limit=100",
			"support-tickets": "support_tickets?select=id,user_id,subject,message,status,priority,created_at,updated_at,profiles(full_name,email,role)&order=created_at.desc&limit=50",
			"consultations":   "app_consultations?select=id,client_id,lawyer_id,consultation_type,scheduled_day,scheduled_time,status,price,notes,created_at,profiles(full_name,email),lawyer_directory(name,specialty),app_payments(id,status,total_amount,method,created_at)&order=created_at.desc&limit=50",
		}
		path := paths[r.URL.Query().Get("resource")]
		if path == "" {
			writeError(w, http.StatusBadRequest, "Resource admin tidak valid")
			return
		}
		var rows []map[string]interface{}
		if err := supabaseREST(http.MethodGet, path, nil, &rows); err != nil {
			writeError(w, http.StatusBadGateway, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, rows)
		return
	}

	if r.Method != http.MethodPatch {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}
	var req AdminRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	switch req.Action {
	case "verify-lawyer":
		err = verifyLawyerAdmin(req.LawyerUserID)
	case "reject-lawyer":
		err = supabaseREST(http.MethodPatch, "profiles?id=eq."+queryEscape(req.LawyerUserID), map[string]string{"status": "suspended"}, nil)
		if err == nil {
			err = supabaseREST(http.MethodPatch, "lawyer_profiles?user_id=eq."+queryEscape(req.LawyerUserID), map[string]string{"verification_status": "rejected"}, nil)
		}
	case "update-client-status":
		err = supabaseREST(http.MethodPatch, "profiles?id=eq."+queryEscape(req.ClientID)+"&role=eq.client", map[string]interface{}{"status": req.Status, "updated_at": time.Now().Format(time.RFC3339)}, nil)
	case "update-support-ticket":
		err = supabaseREST(http.MethodPatch, "support_tickets?id=eq."+queryEscape(req.TicketID), map[string]interface{}{"status": req.Status, "updated_at": time.Now().Format(time.RFC3339)}, nil)
	case "reply-support-ticket":
		var tickets []map[string]interface{}
		err = supabaseREST(http.MethodGet, "support_tickets?id=eq."+queryEscape(req.TicketID)+"&select=message", nil, &tickets)
		if err == nil {
			message := ""
			if len(tickets) > 0 && tickets[0]["message"] != nil {
				message = fmt.Sprint(tickets[0]["message"])
			}
			note := "\n\n---\nBalasan admin (" + time.Now().Format("02 Jan 2006 15:04") + "):\n" + strings.TrimSpace(req.Response)
			err = supabaseREST(http.MethodPatch, "support_tickets?id=eq."+queryEscape(req.TicketID), map[string]interface{}{"message": message + note, "status": "resolved", "updated_at": time.Now().Format(time.RFC3339)}, nil)
		}
	case "update-payment-status":
		err = updatePaymentStatusAdmin(req.PaymentID, req.Status)
	default:
		writeError(w, http.StatusBadRequest, "Aksi admin tidak valid")
		return
	}
	if err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "success", "adminId": adminID})
}

func midtransNotificationHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var notification MidtransNotification
	if err := json.NewDecoder(r.Body).Decode(&notification); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid notification payload")
		return
	}
	if !verifyMidtransSignature(notification) {
		writeError(w, http.StatusUnauthorized, "Invalid Midtrans signature")
		return
	}

	status := mapMidtransStatus(notification)
	patch := map[string]interface{}{
		"status": status,
		"method": normalizePaymentMethod(notification.PaymentType),
	}
	if status == "paid" {
		patch["paid_at"] = time.Now().Format(time.RFC3339)
	}
	if err := supabaseREST(http.MethodPatch, "app_payments?external_reference=eq."+notification.OrderID, patch, nil); err != nil {
		writeError(w, http.StatusBadGateway, err.Error())
		return
	}

	var payments []SupabasePayment
	if err := supabaseREST(http.MethodGet, "app_payments?external_reference=eq."+notification.OrderID+"&select=id,consultation_id", nil, &payments); err == nil && len(payments) > 0 {
		consultationStatus := status
		if consultationStatus == "failed" {
			consultationStatus = "cancelled"
		}
		if err := supabaseREST(http.MethodPatch, "app_consultations?id=eq."+payments[0].ConsultationID, map[string]string{"status": consultationStatus}, nil); err != nil {
			writeError(w, http.StatusBadGateway, err.Error())
			return
		}
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"status":  "ok",
		"payment": status,
		"orderId": notification.OrderID,
	})
}

func main() {
	loadLocalEnv()

	mux := http.NewServeMux()
	mux.HandleFunc("/api/health", corsMiddleware(healthHandler))
	mux.HandleFunc("/api/register", corsMiddleware(registerHandler))
	mux.HandleFunc("/api/payments", corsMiddleware(createPaymentHandler))
	mux.HandleFunc("/api/payments/midtrans-notification", corsMiddleware(midtransNotificationHandler))
	mux.HandleFunc("/api/lawyer/consultations", corsMiddleware(lawyerConsultationsHandler))
	mux.HandleFunc("/api/consultations/status", corsMiddleware(updateConsultationStatusHandler))
	mux.HandleFunc("/api/admin", corsMiddleware(adminHandler))

	port := ":5000"
	fmt.Printf("=================================\n")
	fmt.Printf("FINPROSE backend is running\n")
	fmt.Printf("URL: http://localhost%s\n", port)
	fmt.Printf("Database: Supabase\n")
	fmt.Printf("=================================\n")

	if err := http.ListenAndServe(port, mux); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
