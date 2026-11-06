# Open House — páginas em Next.js

Parte do app feita com Next.js (exportação estática). O celular do administrador serve as páginas em
`http://IP-DO-CELULAR:8080/next/` e elas leem `/api/state` do mesmo servidor, sem CORS.

- `/next/` — resumo do custo do mês, por pessoa e quem pagou.
- `/next/ficha/` — ficha do imóvel para imprimir (dados, partes da casa, bens e documentos).

Compilar no computador:

    cd web && npm install && npm run build
    cp -r out/* ../app/src/main/assets/next/

O fluxo do GitHub (`.github/workflows/build-casa.yml`) faz isso sozinho antes de gerar o APK.
