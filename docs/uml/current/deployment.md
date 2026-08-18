# Deployment — current

```mermaid
flowchart LR
  VITE[npm run dev / build]
  DATA[public/data bundled]
  CAP[Capacitor android]
  PKG[com.gunnchos.archiveoflife]
  VITE --> DATA
  VITE --> CAP
  CAP -.-> PKG
```

Pixel 6a blocked. Offline play uses bundled data; live NASA/COL import is optional and audited.
