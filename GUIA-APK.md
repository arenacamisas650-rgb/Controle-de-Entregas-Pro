# 📱 Entrega Pro — Guia Completo para Gerar o APK

## Estrutura do Projeto

```
entrega-pro/
├── index.html          ← App principal (PWA)
├── sw.js               ← Service Worker (offline)
├── manifest.json       ← Manifesto PWA
├── icons/
│   ├── icon-192.png    ← Ícone do app (192x192)
│   └── icon-512.png    ← Ícone do app (512x512)
└── android/            ← Gerado pelo Capacitor
```

---

## OPÇÃO A — PWA direto no celular (mais fácil, sem APK)

### Passos:
1. Hospede os arquivos em qualquer servidor com HTTPS:
   - **Netlify** (gratuito): arraste a pasta em [netlify.com/drop](https://netlify.com/drop)
   - **GitHub Pages**: suba para repositório e ative Pages
   - **Vercel**: `npx vercel` na pasta do projeto

2. Abra o link no Chrome do Android

3. Menu (⋮) → **"Adicionar à tela inicial"**

4. O app vai aparecer igual a um APK nativo!

> ✅ Vantagem: instantâneo, sem necessidade de Play Store
> ⚠️ Limitação: precisa de internet na primeira vez

---

## OPÇÃO B — APK via Capacitor (recomendado para APK real)

### Pré-requisitos (instale nesta ordem):

```bash
# 1. Node.js (versão 18 ou superior)
# Baixe em: https://nodejs.org

# 2. Java JDK 17
# Baixe em: https://adoptium.net

# 3. Android Studio
# Baixe em: https://developer.android.com/studio

# 4. Verifique as instalações:
node --version      # deve mostrar v18+
java --version      # deve mostrar 17+
```

### Configurar variáveis de ambiente (Windows):
```
JAVA_HOME = C:\Program Files\Eclipse Adoptium\jdk-17...
ANDROID_HOME = C:\Users\SEU_USUARIO\AppData\Local\Android\Sdk
```
Adicione ao PATH:
```
%ANDROID_HOME%\tools
%ANDROID_HOME%\platform-tools
```

### Passo a passo para gerar o APK:

```bash
# PASSO 1 — Entre na pasta do projeto
cd entrega-pro

# PASSO 2 — Inicialize o NPM
npm init -y

# PASSO 3 — Instale o Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# PASSO 4 — Inicialize o Capacitor
npx cap init "Entrega Pro" "com.entregapro.app" --web-dir "."

# PASSO 5 — Adicione a plataforma Android
npx cap add android

# PASSO 6 — Copie os arquivos web para o Android
npx cap sync android

# PASSO 7 — Abra no Android Studio
npx cap open android
```

### No Android Studio:

1. Aguarde o Gradle sincronizar (pode demorar na primeira vez)

2. Conecte seu celular via USB com **Depuração USB** ativada
   - Ou use o emulador: **AVD Manager → Create Virtual Device**

3. Para testar: clique no botão **▶ Run** (triângulo verde)

4. Para gerar o APK final:
   ```
   Build → Build Bundle(s) / APK(s) → Build APK(s)
   ```

5. O APK estará em:
   ```
   android/app/build/outputs/apk/debug/app-debug.apk
   ```

6. Transfira para o celular e instale (ative "Fontes desconhecidas" nas configurações)

---

## OPÇÃO C — APK via WebView simples (mais leve)

Crie um projeto Android básico com uma WebView que carrega seu HTML local:

### MainActivity.java (ou Kotlin):
```java
public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        WebView webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);        // localStorage
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
        
        setContentView(webView);
        webView.loadUrl("file:///android_asset/www/index.html");
    }
}
```

Coloque os arquivos HTML em: `app/src/main/assets/www/`

---

## Criar os Ícones do App

### Online (mais fácil):
1. Vá em [favicon.io](https://favicon.io) ou [appicon.co](https://appicon.co)
2. Faça upload de uma imagem (ex: 📦 ou logo da empresa)
3. Baixe os ícones nos tamanhos 192x192 e 512x512
4. Coloque na pasta `icons/`

### Usando ImageMagick (terminal):
```bash
# Instale: https://imagemagick.org
convert logo.png -resize 192x192 icons/icon-192.png
convert logo.png -resize 512x512 icons/icon-512.png
```

---

## Hospedar em Servidor Local (para testar PWA)

```bash
# Com Python (já vem no Windows/Mac/Linux):
python -m http.server 8080

# Com Node.js:
npx serve .

# Acesse no celular (mesmo WiFi):
# http://SEU_IP_LOCAL:8080
# Ex: http://192.168.1.100:8080
```

---

## Comandos Úteis do Capacitor

```bash
# Após alterar o HTML, sincronize:
npx cap sync android

# Abrir Android Studio:
npx cap open android

# Copiar arquivos sem sincronizar plugins:
npx cap copy android

# Atualizar Capacitor:
npm update @capacitor/core @capacitor/cli @capacitor/android
```

---

## Permissões Necessárias (android/app/src/main/AndroidManifest.xml)

O Capacitor já adiciona automaticamente, mas certifique-se que estão presentes:

```xml
<uses-permission android:name="android.permission.INTERNET"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.VIBRATE"/>
```

---

## Configurar capacitor.config.json

```json
{
  "appId": "com.entregapro.app",
  "appName": "Entrega Pro",
  "webDir": ".",
  "server": {
    "androidScheme": "https"
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 1500,
      "backgroundColor": "#0A0A0F",
      "showSpinner": false
    }
  }
}
```

---

## Melhorias Futuras (Roadmap)

### 🚀 Fase 2 — Funcionalidades
- [ ] **Câmera** — Fotografar comprovantes de entrega
- [ ] **Notificações** — Lembrete diário para registrar rotas
- [ ] **Compartilhar relatório** — PDF por WhatsApp
- [ ] **Widget** — Iniciar rota direto da tela inicial
- [ ] **Multi-motorista** — Suporte a equipes

### 📊 Fase 3 — Analytics
- [ ] **Ranking de empresas** — Qual paga mais por km
- [ ] **Previsão de ganhos** — Média dos últimos 30 dias
- [ ] **Alerta de combustível** — Aviso quando gasto > X%
- [ ] **Relatório semanal automático**

### ☁️ Fase 4 — Cloud
- [ ] **Backup automático** Google Drive / iCloud
- [ ] **Sincronização** entre dispositivos
- [ ] **Login** com Google

---

## Resolução de Problemas Comuns

| Problema | Solução |
|----------|---------|
| GPS não funciona no APK | Adicionar permissões no AndroidManifest.xml |
| localStorage vazio | Verificar `setDomStorageEnabled(true)` no WebView |
| App não abre offline | Conferir `LOAD_CACHE_ELSE_NETWORK` no WebSettings |
| Gradle sync falha | Verificar JAVA_HOME apontando para JDK 17 |
| Ícones não aparecem | Checar tamanhos: deve ser exatamente 192x192 e 512x512 |

---

## Suporte

- Documentação Capacitor: https://capacitorjs.com/docs
- Android Studio Help: https://developer.android.com/studio/intro
- PWA Checker: https://web.dev/measure/
