$body = Get-Content -Raw 'F:/FINPROSE/FINPROSE/request_body.json'
$apiKey = $env:GEMINI_API_KEY
if (-not $apiKey) {
  throw 'Set GEMINI_API_KEY before running this script.'
}
$url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=$apiKey"

$response = Invoke-RestMethod -Method POST -Uri $url `
    -Headers @{ 'Content-Type' = 'application/json' } `
    -Body $body

$response.candidates[0].content.parts[0].text
