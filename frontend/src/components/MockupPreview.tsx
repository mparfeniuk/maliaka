import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
  Slider,
  Stack,
  Collapse,
  Snackbar,
  Alert,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import DownloadIcon from "@mui/icons-material/Download";
import ShareIcon from "@mui/icons-material/Share";
import FacebookIcon from "@mui/icons-material/Facebook";
import EmailIcon from "@mui/icons-material/Email";

interface MockupPreviewProps {
  svg: string;
}

export default function MockupPreview({ svg }: MockupPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);

  // Position and size controls
  const [positionX, setPositionX] = useState(50);
  const [positionY, setPositionY] = useState(40);
  const [scale, setScale] = useState(50);
  const [showControls, setShowControls] = useState(false);

  const [tshirtLoaded, setTshirtLoaded] = useState(false);
  const [svgDataUrl, setSvgDataUrl] = useState<string | null>(null);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Share state
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Convert SVG to data URL
  useEffect(() => {
    if (!svg) {
      setSvgDataUrl(null);
      return;
    }

    try {
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      setSvgDataUrl(url);
      return () => URL.revokeObjectURL(url);
    } catch (err) {
      console.error("SVG conversion error:", err);
    }
  }, [svg]);

  // Drag handlers
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
  }, []);

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();

      const deltaX = clientX - dragStart.x;
      const deltaY = clientY - dragStart.y;

      const percentDeltaX = (deltaX / rect.width) * 100;
      const percentDeltaY = (deltaY / rect.height) * 100;

      setPositionX((prev) => Math.max(10, Math.min(90, prev + percentDeltaX)));
      setPositionY((prev) => Math.max(10, Math.min(80, prev + percentDeltaY)));
      setDragStart({ x: clientX, y: clientY });
    },
    [isDragging, dragStart]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragMove(touch.clientX, touch.clientY);
  };

  // Generate mockup image for sharing
  const generateMockupImage = async (): Promise<Blob | null> => {
    if (!containerRef.current || !svgDataUrl) return null;

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      canvas.width = 800;
      canvas.height = 800;

      // Load t-shirt image
      const tshirtImg = new Image();
      tshirtImg.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        tshirtImg.onload = resolve;
        tshirtImg.onerror = reject;
        tshirtImg.src = "/t-shirt.png";
      });

      // Draw t-shirt
      ctx.drawImage(tshirtImg, 0, 0, canvas.width, canvas.height);

      // Load SVG
      const svgImg = new Image();
      await new Promise((resolve, reject) => {
        svgImg.onload = resolve;
        svgImg.onerror = reject;
        svgImg.src = svgDataUrl;
      });

      // Calculate SVG position
      const svgWidth = (canvas.width * scale) / 100;
      const svgHeight = svgWidth * (svgImg.height / svgImg.width);
      const svgX = (canvas.width * positionX) / 100 - svgWidth / 2;
      const svgY = (canvas.height * positionY) / 100 - svgHeight / 2;

      ctx.drawImage(svgImg, svgX, svgY, svgWidth, svgHeight);

      return new Promise((resolve) => {
        canvas.toBlob(resolve, "image/png", 0.95);
      });
    } catch (err) {
      console.error("Error generating mockup:", err);
      return null;
    }
  };

  // Download mockup
  const handleDownloadMockup = async () => {
    setIsSharing(true);
    try {
      const blob = await generateMockupImage();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "maliaka-tshirt.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setShareError("Помилка завантаження");
    } finally {
      setIsSharing(false);
    }
  };

  // Share to social
  const handleShare = async (
    platform: "native" | "facebook" | "twitter" | "email"
  ) => {
    setIsSharing(true);
    try {
      const blob = await generateMockupImage();

      if (platform === "native" && navigator.share && blob) {
        const file = new File([blob], "maliaka-tshirt.png", {
          type: "image/png",
        });
        await navigator.share({
          title: "Maliaka - Дитячий малюнок на футболці",
          text: "Подивіться на цей чудовий дитячий малюнок на футболці!",
          files: [file],
        });
      } else {
        const text = encodeURIComponent(
          "Дитячий малюнок на футболці від Maliaka!"
        );
        const url = encodeURIComponent(window.location.href);

        let shareUrl = "";
        switch (platform) {
          case "facebook":
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
            break;
          case "twitter":
            shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
            break;
          case "email":
            shareUrl = `mailto:?subject=${text}&body=${url}`;
            break;
        }

        if (shareUrl) window.open(shareUrl, "_blank");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setShareError("Помилка поширення");
      }
    } finally {
      setIsSharing(false);
    }
  };

  if (!svgDataUrl) {
    return (
      <Card elevation={0} sx={{ borderRadius: 4 }}>
        <CardContent sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={0} sx={{ borderRadius: 4 }}>
      <CardContent sx={{ p: 2 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            👕 Футболка
          </Typography>
          <IconButton
            onClick={() => setShowControls(!showControls)}
            size="small"
          >
            <TuneIcon />
          </IconButton>
        </Box>

        {/* T-shirt mockup */}
        <Box
          ref={containerRef}
          sx={{
            position: "relative",
            width: "100%",
            maxWidth: 400,
            mx: "auto",
            aspectRatio: "1/1",
            borderRadius: 4,
            overflow: "hidden",
            cursor: isDragging ? "grabbing" : "grab",
            bgcolor: "grey.100",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleDragEnd}
        >
          {/* T-shirt background */}
          <img
            src="/t-shirt.png"
            alt="T-shirt"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              userSelect: "none",
              pointerEvents: "none",
            }}
            onLoad={() => setTshirtLoaded(true)}
            draggable={false}
          />

          {/* SVG overlay */}
          {tshirtLoaded && (
            <div
              ref={svgRef}
              style={{
                position: "absolute",
                left: `${positionX}%`,
                top: `${positionY}%`,
                transform: "translate(-50%, -50%)",
                width: `${scale}%`,
                pointerEvents: "none",
                transition: isDragging ? "none" : "all 0.1s ease-out",
              }}
            >
              <img
                src={svgDataUrl}
                alt="Drawing"
                style={{
                  width: "100%",
                  height: "auto",
                  pointerEvents: "none",
                }}
                draggable={false}
              />
            </div>
          )}
        </Box>

        {/* Hint */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", textAlign: "center", mt: 1 }}
        >
          👆 Перетягуйте малюнок
        </Typography>

        {/* Controls */}
        <Collapse in={showControls}>
          <Box sx={{ mt: 2, p: 2, bgcolor: "grey.50", borderRadius: 3 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Позиція X: {positionX}%
                </Typography>
                <Slider
                  value={positionX}
                  onChange={(_, v) => setPositionX(v as number)}
                  min={10}
                  max={90}
                  size="small"
                />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Позиція Y: {positionY}%
                </Typography>
                <Slider
                  value={positionY}
                  onChange={(_, v) => setPositionY(v as number)}
                  min={10}
                  max={80}
                  size="small"
                />
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Розмір: {scale}%
                </Typography>
                <Slider
                  value={scale}
                  onChange={(_, v) => setScale(v as number)}
                  min={10}
                  max={100}
                  size="small"
                />
              </Box>
            </Stack>
          </Box>
        </Collapse>

        {/* Actions */}
        <Stack
          direction="row"
          spacing={1}
          sx={{ mt: 2 }}
          justifyContent="center"
        >
          <Tooltip title="Завантажити">
            <IconButton
              onClick={handleDownloadMockup}
              disabled={isSharing}
              sx={{
                bgcolor: "primary.main",
                color: "white",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              {isSharing ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <DownloadIcon />
              )}
            </IconButton>
          </Tooltip>

          {"share" in navigator && (
            <Tooltip title="Поділитися">
              <IconButton
                onClick={() => handleShare("native")}
                sx={{ bgcolor: "grey.100" }}
              >
                <ShareIcon />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Facebook">
            <IconButton
              onClick={() => handleShare("facebook")}
              sx={{ bgcolor: "grey.100" }}
            >
              <FacebookIcon sx={{ color: "#1877F2" }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Email">
            <IconButton
              onClick={() => handleShare("email")}
              sx={{ bgcolor: "grey.100" }}
            >
              <EmailIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* Error snackbar */}
        <Snackbar
          open={!!shareError}
          autoHideDuration={3000}
          onClose={() => setShareError(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert severity="error" onClose={() => setShareError(null)}>
            {shareError}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
}
