# ⚔️ THE SYSTEM: AWAKENING — Founder Hunter Application

Web anketa / upitnik za registraciju prvih "Founder Hunter" testera za mobilnu aplikaciju **THE SYSTEM: AWAKENING** (Solo Leveling in real life), dizajnirana sa identičnim Sci-Fi HUD stilom iz igre/aplikacije.

---

## ⚡ Ključne Funkcionalnosti

1. **Autentičan Solo Leveling HUD Dizajn**:
   - Holografski tamni cyber interfejs sa neonsko plavim (`#00e5ff`) okvirima i ugaonim zagradama (`⌜ ⌝ ⌞ ⌟`).
   - Top status bar sa `4,000 GOLD`, `0 CRYSTALS`, `LV. 1`, i Shadow Monarch avatarom.
   - **Dinamički EXP Progress Bar**: Kako korisnik popunjava anketu, EXP bar se puni od `0 / 195 EXP` do `195 / 195 EXP (100%)`.
   - Autentični tech bedževi za odabir (`[A] Android`, `[B] iOS`, `[C] Both`).
   - Upozorenje `⚠ CAUTION` na dnu sa animiranim tajmerom.
   - Solo Leveling pop-up notifikacija (`[SYSTEM NOTIFICATION] AWAKENING SUCCESSFUL`) sa dodelom Hunter ID koda (`#HNTR-XXXX`).
   - **Sci-Fi Zvučni Efekti**: Web Audio API sintetizator (klikovi, hover beep, i pobednički zvučni efekat buđenja / level-up) sa mogućnošću uključivanja/isključivanja (`SFX: ON / OFF`).

2. **Pitanja iz Ankete (Founder Hunter Application)**:
   - `Discord Username @ *` (sa placeholderom `@axon`)
   - `Device *` (`Android`, `iOS`, `Both`)
   - `Your Hunter Path? *` (`Gym`, `Study`, `Work`, `Discipline`, `All`)
   - `How active will you be? *` (`1-2h daily`, `3-4h daily`, `Hardcore 5h+`)
   - `Will you report bugs? *` (`Yes, I will help`)
   - `Email (optional - backup link)`
   - `How did you find us? *` (`Youtube`, `Tiktok`, `Reddit`, `Instagram`, `Other`)

3. **Admin Dashboard (`/admin.html`)**:
   - Pregled svih prijavljenih testera u realnom vremenu.
   - Statistika: Ukupno prijavljenih, podela po uređajima (Android vs iOS vs Both), aktivnost (Hardcore 5h+), volonteri za bugove.
   - Pretraga kandidata po Discord imenu, ID-u ili platformi.
   - **One-Click "Copy Discord Usernames"**: Kopira sve Discord tagove odjednom za dodelu role na Discord serveru!
   - **One-Click "Export CSV"**: Preuzimanje Excel / Google Sheets kompatibilne tabele sa UTF-8 podrškom.
   - Zaštićeno tajnim administratorskim ključem (default: `hunter2026`).

4. **Discord Webhook Integracija (Opciono)**:
   - Svaka prijava može automatski slati Solo Leveling embed karticu direktno u tvoj Discord kanal za prijave testera!

---

## 🚀 Pokretanje

### 1. Instalacija zavisnosti
```bash
npm install
```

### 2. Pokretanje servera
```bash
npm start
```
Ili razvojni režim sa auto-reloadom:
```bash
npm run dev
```

Aplikacija se pokreće na:
- **Anketa za kandidate**: [http://localhost:3030](http://localhost:3030)
- **Admin Kontrolna Tabla**: [http://localhost:3030/admin.html](http://localhost:3030/admin.html)
- **Default Admin Ključ**: `hunter2026`

---

## ⚙️ Podešavanja (.env)

U fajlu `.env` možeš promeniti:
```env
PORT=3030
ADMIN_SECRET=hunter2026

# Ako želiš da ti prijave stižu direktno u Discord kanal, ovde unesi Webhook URL:
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

---

## 📁 Struktura Projekta

```
the system poll/
├── server.js            # Express API i rukovanje podacima
├── package.json         # Konfiguracija i skripte
├── .env                 # Port, admin tajna i Discord webhook
├── data/
│   └── applications.json # Čuvanje svih pristiglih prijava
└── public/
    ├── index.html       # Glavna stranica ankete (Solo Leveling HUD)
    ├── style.css        # Kompletna stilizacija, neonski sjaj, scanlines
    ├── app.js           # Klijentska logika, Web Audio SFX, validacija
    ├── admin.html       # Kontrolna tabla za pregled testera
    └── admin.js         # Logika za tabelu, CSV i kopiranje Discord tagova
```
