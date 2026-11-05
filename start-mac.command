#!/bin/bash
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js ist nicht installiert. Es wird für das Spiel gebraucht."
  answer=$(osascript -e 'button returned of (display dialog "Node.js ist nicht installiert. Jetzt automatisch installieren?" buttons {"Nein", "Ja, installieren"} default button 2 with icon caution)' 2>/dev/null)
  if [ "$answer" != "Ja, installieren" ]; then exit 1; fi

  version=$(curl -fsSL https://nodejs.org/dist/index.json 2>/dev/null | grep -m1 '"lts":"' | sed -E 's/.*"version":"([^"]+)".*/\1/')
  if [ -z "$version" ]; then
    echo "Keine Internetverbindung? Bitte von https://nodejs.org installieren."
    read -r -p "Enter zum Schließen"; exit 1
  fi
  pkg="/tmp/node-$version.pkg"
  echo "Lade Node.js $version herunter ..."
  curl -fL "https://nodejs.org/dist/$version/node-$version.pkg" -o "$pkg" || { echo "Download fehlgeschlagen."; read -r -p "Enter zum Schließen"; exit 1; }
  echo "Installiere (dein Mac-Passwort wird abgefragt) ..."
  sudo installer -pkg "$pkg" -target / || { echo "Installation fehlgeschlagen."; read -r -p "Enter zum Schließen"; exit 1; }
  rm -f "$pkg"
  export PATH="$PATH:/usr/local/bin"
  if ! command -v node >/dev/null 2>&1; then
    echo "Node.js wurde nicht gefunden. Bitte Terminal neu starten und nochmal doppelklicken."
    read -r -p "Enter zum Schließen"; exit 1
  fi
fi

echo "Spiel läuft. Dieses Fenster offen lassen, zum Beenden schließen."
(sleep 1; open http://localhost:3000) &
node server.js
