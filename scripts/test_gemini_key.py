import json
import os
import urllib.request
import urllib.error
from pathlib import Path

def load_key():
    key = os.environ.get('GEMINI_API_KEY')
    if key:
        return key
    env_local = Path('.env.local')
    if env_local.exists():
        for line in env_local.read_text().splitlines():
            if line.strip().startswith('GEMINI_API_KEY='):
                return line.split('=', 1)[1].strip().strip('"')
    env_txt = Path('env.txt')
    if env_txt.exists():
        for line in env_txt.read_text().splitlines():
            if 'gemini' in line.lower() and '=' in line:
                return line.split('=', 1)[1].strip()
    return None

def main():
    api_key = load_key()
    if not api_key:
        raise SystemExit('GEMINI_API_KEY not found in environment or config files')
    print('Using GEMINI_API_KEY ending with:', api_key[-4:])

    model = os.environ.get('GEMINI_MODEL', 'gemini-2.5-flash')
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}'
    body = {
        'contents': [
            {
                'role': 'user',
                'parts': [{'text': 'Return JSON {"ping":"pong"}'}],
            }
        ],
        'generationConfig': {
            'responseMimeType': 'application/json',
            'temperature': 0.1,
        },
    }

    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = response.read().decode('utf-8')
            print('Status:', response.status)
            print('Response:', payload)
    except urllib.error.HTTPError as exc:
        print('HTTP error:', exc.code)
        print('Body:', exc.read().decode())
    except Exception as exc:
        print('Request failed:', exc)

if __name__ == '__main__':
    main()
