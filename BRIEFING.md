# VISTA 360 · Serra Alta Residence: briefing do projeto

## O que é
Plataforma web para vender apartamentos na planta. O corretor manda um link pelo WhatsApp e o cliente, no celular ou no computador:
1. gira o prédio em 360° com imagens renderizadas (24 ângulos, luz de dia, fim de tarde e noite);
2. toca num apartamento e vê planta, área, preço, disponibilidade e botão de WhatsApp;
3. entra no apartamento num **tour 3D em tempo real** (three.js): maquete vista de cima, passeio em primeira pessoa, 3 decorações e 3 luzes;
4. vê a localização no Google Maps e os serviços do estúdio.

Nome, preços, áreas e disponibilidade são **fictícios**: é uma demonstração.

## Estrutura deste zip
```
index.html          app principal: escolhe sozinho a versão celular ou computador
celular.html        mesmo app, força imagens leves (renders/m/)
computador.html     mesmo app, força imagens em alta (renders/)
3d/tour3d.js        tour 3D do apartamento (ES module, ~700 linhas, sem outras libs)
3d/three.module.js  three.js r187 (MIT), necessário para o tour 3D
3d/three.core.js    three.js r187 (MIT)
renders/hotspots.js polígonos clicáveis de cada apartamento em cada um dos 24 quadros
renders/amostras/   algumas imagens de exemplo (o projeto completo tem ~150 imagens)
```
O pacote completo com todas as imagens (21 MB) é o VISTA360_SerraAlta.zip. Este zip leva só o código e algumas amostras.

## Como rodar
As imagens dos 24 ângulos não estão neste zip. Para ver o app funcionando, use o pacote completo:
```
cd vista360 && python3 -m http.server 8000   # abrir http://localhost:8000
```
Precisa de um servidor, porque o tour 3D usa ES modules e por `file://` não funciona.
Para publicar de graça: Cloudflare Pages (upload do zip completo) ou Netlify Drop.

## Arquitetura do app (index.html)
- Bloco `const CONFIG` no início do script: WhatsApp, nome, preço/m², endereço, lat/lng, imagens de planta, nome do estúdio e lista de serviços.
- Giro: um `<canvas>` desenha o quadro atual. Ele só redesenha quando algo muda, o que poupa bateria. As imagens são pré-carregadas por luz (`loadSet`).
- Camada clicável: um SVG por cima da imagem com polígonos de `hotspots.js`. No celular, ela só é montada quando o giro para.
- Layouts: celular em pé (gaveta inferior), celular deitado (coluna lateral), tablet e computador (painel lateral; a torre centraliza na área livre).
- Busca: aceita "1201", "12º andar", "3 dorm", "até 1,5 mi", "frente" e "disponível".
- Tela limpa: esconde toda a interface (tecla H no computador).
- Fallback: se o aparelho não tiver WebGL2, o botão do apartamento abre o visualizador 360° antigo (`openInterior360`).

## Arquitetura do tour 3D (3d/tour3d.js)
- `PLANS.front` (112 m²) e `PLANS.fundos` (84 m²): cômodos (retângulos), paredes com aberturas (portas, janelas, vidro) e pontos de vista.
- Móveis procedurais (`F.sofa`, `F.bed`, `F.island`…) feitos com caixas arredondadas, sem modelos externos.
- Texturas procedurais em canvas: madeira, porcelanato, mármore, tecido e tapete. Os 3 estilos ficam em `STYLES`.
- Luz: sol direcional com sombra, hemisférica, ambiente feito com PMREM de uma "sala de estúdio", e luzes pontuais acesas à noite.
- Paisagem pela janela: um cilindro montado com faixas laterais dos renders externos do prédio, mais um céu em gradiente.
- Navegação: vista de cima (órbita), passeio (yaw/pitch), toque no chão para andar com rota pelas portas, e pinça ou roda para zoom.
- Unidades do lado oeste: o grupo é espelhado com `scale.x = -1`.

## Testes já feitos
Testado em navegador automatizado (Chrome, sem placa de vídeo) simulando iPhone, Android deitado, iPad, computador, celular.html e computador.html.
Passaram 20 de 20 verificações em cada um: abrir, girar, luzes, disponibilidade, andar, lista, toque no prédio, WhatsApp, mapa, tour 3D, estilos, tela limpa e serviços.
**Não foi testado em iPhone ou Android físicos.**

## Limitações conhecidas
- O link do artefato do claude.ai não abre no app Claude do iPhone ("This browser isn't supported"). O projeto precisa ser hospedado fora, por exemplo na Cloudflare Pages.
- O tour 3D tem visual de jogo, não de foto: os móveis são procedurais e não há lightmaps baked nem pós-processamento (SSAO, bloom).
- As imagens do prédio estão em 1600x900, abaixo de 4K. Foram renderizadas em Blender (Cycles na CPU) num PC de 8 GB de RAM.
- O Google Maps embutido (iframe) funciona hospedado; no claude.ai ele é bloqueado.
- three.js vai sem minificar (~2,1 MB, cerca de 450 KB com gzip).

## O que o dono quer melhorar (pedidos do cliente)
- Mais realismo, "como se o prédio estivesse do lado": qualidade de cinema e mais animação.
- Resolução acima de 4K.
- Entrar em todas as partes do prédio: áreas comuns (hall, piscina, academia, salão).
- Mais opções de decoração.
- Google Maps da cidade de verdade (talvez Photorealistic 3D Tiles, que precisa de chave e cobrança).
- Reaproveitar a base para outros prédios a partir da planta (PDF, DWG ou SketchUp).
- Funcionar perfeitamente no celular (iPhone e Android) e no computador.
