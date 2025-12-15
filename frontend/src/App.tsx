import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import WebApp from "@twa-dev/sdk";
import {
  Container,
  Box,
  Typography,
  AppBar,
  Toolbar,
  CircularProgress,
  Snackbar,
  Alert,
  Fade,
  Link,
} from "@mui/material";
import Upload from "./components/Upload";
import Result from "./components/Result";
import MaskEditor, { ProcessingSettings } from "./components/MaskEditor";
import { processImage } from "./services/api";
import type { ProcessResult } from "./types";

type AppState = "upload" | "edit" | "processing" | "result";

function App() {
  const { i18n, t } = useTranslation();
  const [appState, setAppState] = useState<AppState>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<"ua" | "en">("ua");
  const [isCollapsed, setIsCollapsed] = useState(true);

  const disclaimerCopy = {
    ua: {
      heading: "Дисклеймер марафону",
      intro: [
        "Марафон з вайбкодінгу: 10 проєктів, по одному на день, максимум 5 годин.",
        "Легка навчальна штука, щоб перезавантажитися після великих задач.",
        "Це швидкі прототипи, зроблені в темпі 3–4 годин, тож можливі невеличкі лаги.",
      ],
      goalsLabel: "Мета",
      bullets: [
        "Пофанити й покреативити, пробрейнстормити ідеї.",
        "Відпрацювати вайбкодинг і швидкий перехід від ідеї до MVP.",
        "Подивитися, як AI-підхід впливає на темп і якість.",
        "Зрозуміти сильні/слабкі сторони підходу. Потенційні продуктові вигоди.",
        "Напрацьовувати нове мислення в реалізації проектів.",
        "Вчасно відриватися від коду й приборкувати перфекціонізм — робити швидко й без залипань.",
      ],
      collapseLabel: isCollapsed ? "Показати" : "Сховати",
      langLabel: "UA",
    },
    en: {
      heading: "Marathon disclaimer",
      intro: [
        "Vibe-coding marathon: 10 projects, one per day, max 5 hours.",
        "A light learning build to reset after bigger work.",
        "These are quick prototypes built in a 3–4 hour sprint, so minor lags are possible.",
      ],
      goalsLabel: "Goals",
      bullets: [
        "Have fun, get creative, brainstorm ideas.",
        "Practice vibe-coding and jumping from idea to live MVP fast.",
        "See how the AI-assisted approach affects speed and quality.",
        "Understand approach strengths/weak spots. Potential product wins.",
        "Build a new mindset for shipping projects.",
        "Step away on time and tame perfectionism — ship fast, skip endless polish.",
      ],
      collapseLabel: isCollapsed ? "Show" : "Hide",
      langLabel: "EN",
    },
  } as const;

  const copy = disclaimerCopy[lang];

  useEffect(() => {
    // Initialize Telegram Web App if available
    if (typeof WebApp !== "undefined" && WebApp.initDataUnsafe) {
      WebApp.ready();
      WebApp.expand();

      // Set language based on Telegram user language
      const tgLang = WebApp.initDataUnsafe?.user?.language_code || "en";
      const supportedLangs: Record<string, string> = {
        uk: "uk",
        sl: "sl",
        en: "en",
      };
      const lang = supportedLangs[tgLang] || "en";
      i18n.changeLanguage(lang);
    } else {
      // Development mode - use browser language or default to Ukrainian
      const browserLang = navigator.language.split("-")[0];
      const supportedLangs: Record<string, string> = {
        uk: "uk",
        sl: "sl",
        en: "en",
      };
      const lang = supportedLangs[browserLang] || "uk";
      i18n.changeLanguage(lang);
      console.log("Running in development mode (not in Telegram)");
    }
  }, [i18n]);

  // Handle file selection - go to mask editor
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError(null);
    setResult(null);
    setAppState("edit");
  };

  // Handle processing from mask editor
  const handleProcessWithMask = async (
    file: File,
    maskDataUrl: string | null,
    settings: ProcessingSettings
  ) => {
    setAppState("processing");
    setError(null);

    try {
      console.log("🎨 Processing with settings:", {
        hasMask: !!maskDataUrl,
        ...settings,
      });
      const data = await processImage(file, {
        maskDataUrl,
        minArtifactSize: settings.minArtifactSize,
        turdsize: settings.turdsize,
        preserveStyle: settings.preserveStyle,
        invertColors: settings.invertColors,
      });
      setResult(data);
      setAppState("result");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      // Map common errors to translation keys
      if (
        errorMessage.includes("network") ||
        errorMessage.includes("connect")
      ) {
        setError(t("errors.networkError"));
      } else if (
        errorMessage.includes("file") ||
        errorMessage.includes("type")
      ) {
        setError(t("errors.invalidFile"));
      } else if (
        errorMessage.includes("large") ||
        errorMessage.includes("size")
      ) {
        setError(t("errors.tooLarge"));
      } else {
        setError(t("errors.processingFailed"));
      }
      setAppState("edit"); // Go back to editor on error
    }
  };

  // Cancel mask editing - go back to upload
  const handleCancelEdit = () => {
    setSelectedFile(null);
    setAppState("upload");
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setSelectedFile(null);
    setAppState("upload");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #6750A4 0%, #381E72 100%)",
        pb: 4,
      }}
    >
      <Container maxWidth="sm" sx={{ px: 2, pt: 2 }}>
        {/* App Bar */}
        <AppBar 
          position="static" 
          elevation={0}
          sx={{ 
            background: "transparent",
            color: "white",
          }}
        >
          <Toolbar sx={{ justifyContent: "center", py: 2 }}>
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                fontFamily: '"Fredoka", sans-serif',
                fontWeight: 600,
                fontSize: { xs: "2rem", sm: "2.5rem" },
                letterSpacing: "0.02em",
                textShadow: "2px 2px 4px rgba(0,0,0,0.2)",
                background: "linear-gradient(45deg, #FFD54F, #FFAB91, #F48FB1)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Maliaka ✨
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Marathon disclaimer banner */}
        <Box
          sx={{
            mb: 2,
            fontFamily: "Arial, sans-serif",
          }}
        >
          <div
            className="w-full rounded-lg border shadow-sm"
            style={{
              backgroundColor: "#fff3b0",
              borderColor: "#e5b700",
              color: "#000",
            }}
          >
            <div className="flex items-start justify-between gap-2 px-3 py-2">
              <div className="flex items-center gap-2">
                <Typography
                  variant="subtitle2"
                  component="div"
                  sx={{ fontFamily: "Arial, sans-serif", fontWeight: 700 }}
                >
                  {copy.heading}
                </Typography>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() =>
                    setLang((prev) => (prev === "ua" ? "en" : "ua"))
                  }
                  className="px-2 py-1 rounded border text-xs font-semibold"
                  style={{
                    borderColor: "#e5b700",
                    backgroundColor: "#fff",
                    color: "#000",
                  }}
                >
                  {lang === "ua" ? "EN" : "UA"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCollapsed((prev) => !prev)}
                  className="px-2 py-1 rounded border text-xs font-semibold flex items-center gap-1"
                  style={{
                    borderColor: "#e5b700",
                    backgroundColor: "#fff",
                    color: "#000",
                  }}
                >
                  <span>{isCollapsed ? "▸" : "▾"}</span>
                  <span>{copy.collapseLabel}</span>
                </button>
              </div>
            </div>

            {!isCollapsed && (
              <div className="px-3 pb-3 space-y-2">
                <div className="text-sm leading-relaxed">
                  {copy.intro.map((line, idx) => (
                    <div key={idx} className="leading-snug">
                      {line}
                    </div>
                  ))}
                </div>

                <div className="text-xs font-semibold uppercase tracking-wide text-black/80 mt-1">
                  {copy.goalsLabel}
                </div>

                <div className="space-y-1">
                  {copy.bullets.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-sm leading-snug"
                    >
                      <span className="pt-[2px]">✓</span>
                      <span className="block">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Box>

        {/* Subtitle */}
        <Typography
          variant="body1"
          align="center"
          sx={{
            color: "rgba(255,255,255,0.8)",
            mb: 3,
            mt: -1,
          }}
        >
          {t("app.subtitle")}
        </Typography>

        {/* Main Content */}
        <Fade in={appState === "upload"} unmountOnExit>
          <Box>
            {appState === "upload" && (
              <Upload onUpload={handleFileSelect} error={error} />
            )}
          </Box>
        </Fade>

        <Fade in={appState === "edit"} unmountOnExit>
          <Box>
            {appState === "edit" && selectedFile && (
              <MaskEditor
                imageFile={selectedFile}
                onProcess={handleProcessWithMask}
                onCancel={handleCancelEdit}
              />
            )}
          </Box>
        </Fade>

        <Fade in={appState === "processing"} unmountOnExit>
          <Box>
            {appState === "processing" && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 10,
                }}
              >
                <CircularProgress
                  size={60}
                  thickness={4}
                  sx={{ color: "white", mb: 3 }}
                />
                <Typography variant="h6" sx={{ color: "white" }}>
                  {t("upload.processing")}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(255,255,255,0.7)", mt: 1 }}
                >
                  Це може зайняти кілька секунд...
                </Typography>
              </Box>
            )}
          </Box>
        </Fade>

        <Fade in={appState === "result"} unmountOnExit>
          <Box>
            {appState === "result" && result && (
              <Result result={result} onReset={handleReset} />
            )}
          </Box>
        </Fade>
      </Container>

      {/* Footer */}
      <Box
        sx={{
          mt: 4,
          pb: 3,
          color: "rgba(255,255,255,0.85)",
          textAlign: "center",
        }}
      >
        <Typography variant="body2">Day 10. Vibe coding marathon.</Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          Author{" "}
          <Link
            href="https://www.linkedin.com/in/mparfeniuk/"
            target="_blank"
            rel="noopener noreferrer"
            color="inherit"
            underline="always"
          >
            Max Parfeniuk
          </Link>
        </Typography>
      </Box>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error && appState === "edit"}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setError(null)}
          severity="error"
          variant="filled"
          sx={{ width: "100%", borderRadius: 3 }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;
