# VISTA360 | Apresentação imobiliária 3D

Experiência web para corretoras e construtoras: escolha de apartamentos, valores e disponibilidade ilustrativos, comparador de iluminação e passeio interativo em Three.js, com versão adaptável a celulares, tablets e computadores.

## Comece em 1 minuto

```bash
python3 -m http.server 8000
```

Abra `http://localhost:8000/`. Não abra o HTML diretamente via `file://`, porque os módulos ES do tour 3D precisam de um servidor HTTP.

> **Importante:** esta é uma **demonstração fictícia**, e o ZIP de origem **não continha todos os renders da fachada**. A versão incluída aqui usa imagens de amostra, sem simular falsamente rotação 360° nem sobrepor apartamentos sobre ângulos incompatíveis. O tour interno em 3D continua disponível.

## Páginas

- `index.html` — escolhe recursos adequados ao dispositivo.
- `celular.html` — favorece imagens leves.
- `computador.html` — favorece qualidade de desktop.
- `3d/` — motor do apartamento em Three.js; biblioteca Three.js obtida via CDN jsDelivr sob licença MIT. Consulte `3d/THREE-LICENSE.txt`.
- `renders/hotspots.js` — regiões de clique para os 24 ângulos **quando o pacote completo for adicionado**.
- `renders/preview-mode.js` — define a utilização de amostras sem giro falso.

## Tornar a apresentação pronta para um empreendimento real

1. Substitua os valores fictícios em `CONFIG` nas três páginas: nome, WhatsApp com código internacional, endereço, coordenadas, plantas, serviços e dados comerciais.
2. Substitua o cálculo ilustrativo de unidades e o status gerado aleatoriamente por informações autorizadas e atualizadas da construtora. **Não anuncie preços ou disponibilidades inventadas como verdadeiros.**
3. Importe os **24 renders de cada horário** para `renders/dia/00.jpg` até `23.jpg`, `renders/tarde/` e `renders/noite/`, bem como imagens adaptadas para `renders/m/`. O pacote de imagens completo do projeto original não foi entregue neste ZIP.
4. Após verificar que os 24 quadros e polígonos correspondem ao mesmo prédio e ângulos, altere `window.VISTA_PREVIEW_ONLY = false` em `renders/preview-mode.js`.
5. Acrescente imagens panorâmicas de interiores em `renders/int/`, quando disponíveis. O tour procedimental 3D independe destas imagens.
6. Teste em iPhone e Android reais antes de apresentar ao cliente.

## Publicação

É um site estático: Cloudflare Pages, Netlify e GitHub Pages funcionam sem build. Suba **os arquivos desta pasta na raiz**. Para GitHub Pages, selecione a branch de publicação em Settings → Pages.

## Limites atuais

- Os renders de 24 ângulos não vieram no ZIP. Neste pacote, dia e noite mostram **imagens de amostra**, com rotação bloqueada.
- O tour interno usa geometria e texturas procedurais; isso não equivale a um render fotográfico de arquitetura.
- O briefing original descreve áreas comuns e imagens acima de 4K como objetivos, **não como funcionalidades entregues**.
- As imagens de amostra podem ter resolução superior a 4K horizontal, mas a qualidade e fidelidade do futuro render final dependem dos arquivos do empreendimento.
- Nomes, local, áreas, valores e disponibilidade são fictícios.

## Créditos

Código do projeto entregue pelo cliente. Motor Three.js incluído com licença MIT em `3d/THREE-LICENSE.txt`.
