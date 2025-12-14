import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

interface SVGViewerProps {
  svg: string;
}

export default function SVGViewer({ svg }: SVGViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && svg) {
      containerRef.current.innerHTML = svg;
      
      // Center and scale SVG to fit container
      const svgElement = containerRef.current.querySelector('svg');
      if (svgElement) {
        svgElement.style.maxWidth = '100%';
        svgElement.style.height = 'auto';
        svgElement.style.display = 'block';
        svgElement.style.margin = '0 auto';
      }
    }
  }, [svg]);

  return (
    <Box 
      ref={containerRef}
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        '& svg': {
          maxHeight: 300,
        },
      }}
    />
  );
}
