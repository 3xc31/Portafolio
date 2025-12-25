import requests
import json

FUNTION_URL = "https://get-historical-data-with-indicators-ugz5lcdyca-uc.a.run.app"

payload = {
    "data": {
        "ticker": "AAPL",
        "startDate": "2023-01-01",
        "endDate": "2023-10-01"
    }
}

response = requests.post(FUNTION_URL, json=payload)
print("Status:", response.status_code)

print("\n--- Response Headers ---")
for header, value in response.headers.items():
    print(f"{header}: {value}")
print("--------------------------\n")


if response.status_code == 200:
    try:
        json_data = response.json() # Parse the JSON response
        print("Response received (full JSON object):")
        print(json.dumps(json_data, indent=2)) # Pretty print the entire JSON for readability
    except json.JSONDecodeError:
        print("Error: Could not decode JSON from response.")
        print("Raw response text:", response.text)
else:
    print(f"Error Response ({response.status_code}):")
    try:
        error_json = response.json()
        print(json.dumps(error_json, indent=2))
    except json.JSONDecodeError:
        print(response.text)