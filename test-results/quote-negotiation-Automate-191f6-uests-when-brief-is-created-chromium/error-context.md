# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - navigation [ref=e3]:
      - link "nmbli" [ref=e4] [cursor=pointer]:
        - /url: /
      - link "Sign in" [ref=e5] [cursor=pointer]:
        - /url: /login
  - region "Notifications alt+T"
  - main [ref=e6]:
    - generic [ref=e7]:
      - heading "Nmbli" [level=1] [ref=e8]
      - paragraph [ref=e9]: Compare car quotes with confidence.
    - generic [ref=e10]:
      - generic [ref=e11]:
        - generic [ref=e12]: Sign in
        - generic [ref=e13]: Choose your preferred sign-in method
      - generic [ref=e15]:
        - tablist [ref=e16]:
          - tab "Magic Link" [selected] [ref=e17]
          - tab "Email & Password" [ref=e18]
        - tabpanel "Magic Link" [ref=e19]:
          - generic [ref=e20]:
            - generic [ref=e21]:
              - generic [ref=e22]: Email
              - textbox "Email" [ref=e23]:
                - /placeholder: you@example.com
            - button "Continue" [ref=e24]
    - paragraph [ref=e25]:
      - text: Need help?
      - link "Contact support" [ref=e26] [cursor=pointer]:
        - /url: mailto:contact@nmbli.com
  - button "Open Next.js Dev Tools" [ref=e32] [cursor=pointer]:
    - img [ref=e33]
  - alert [ref=e36]
```