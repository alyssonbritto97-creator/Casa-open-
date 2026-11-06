# Open House — better home, prosperous home

© Jose Brito · Converta+. Todos os direitos reservados (veja `LICENSE`).

Aplicativo Android para organizar a casa entre várias pessoas. Em português e espanhol (Mais → Idioma e link).

## Como funciona
- O celular do **administrador** instala o app e liga o "servidor da casa". Os dados ficam só nesse celular.
- Os outros celulares, no **mesmo Wi-Fi**, abrem o endereço mostrado no app (ex.: http://192.168.0.10:8080) no navegador. Não precisa instalar nada. O link pode ser enviado pelo WhatsApp.
- O administrador cria um PIN (só no celular dele) e cadastra as pessoas. Cada pessoa escolhe o próprio nome (👤, no topo) para registrar o que fez.
- Tudo funciona sem internet, só dentro do Wi-Fi da casa.

## O que tem
- **Início**: painel com % da casa em dia, gasto do mês, alertas e a casa animada. A faixa do topo (casa, gasto, compras, água, alertas) fica visível em todas as telas.
- **Casa**: desenho animado com 18 partes (telhado, calhas, caixa d'água, muro, portão, elétrica, encanamento, esgoto, gás, cômodos…). Cada parte tem deveres, responsável, quem ajuda, estado (em dia, atenção, precisa consertar, em conserto), próxima revisão, custo do conserto e histórico. Partes críticas ficam marcadas. Tarefas da casa com quem faz e quando.
- **Comida**: o que está sendo feito hoje e por quem, quem comprou, escala de quem cozinha, geladeira/despensa com quantidades e validade, sugestões do que dá para cozinhar, **estoque para 3–12 meses (meta padrão: 6)**, **controle de água potável** (por que não beber da torneira, litros por pessoa, dias restantes, compras) e histórico de compras da semana, café, almoço, lanche e jantar.
- **Compras**: lista do que falta; vem da despensa, das receitas, do cardápio e das partes da casa.
- **Finanças**: custo da casa (por dia, por pessoa, comparação com o mês passado, previsão), **limites por categoria**, quem recebe e quem deve, contas fixas com vencimento, metas para guardar dinheiro juntos e compras futuras.
- **Mais**: escala semanal de compras, cardápio, colaboração (quem ajudou na semana e nos últimos 30 dias), pets (ração, vacinas), **emergência** (pessoas, doentes, partes críticas, kit, quem faz o quê, telefones), **primeiros socorros** (guia e kit da casa), **veículos** (manutenção por data e km, custos), pessoas e idioma.

## Limites
- Se o celular do administrador estiver desligado ou fora do Wi-Fi, ninguém acessa.
- Deixe-o carregando e sem economia de bateria para o Open House.
- Todos da casa podem registrar e atualizar; só o administrador apaga dados financeiros, cria contas fixas, metas e limites.
- As orientações de primeiros socorros são gerais e não substituem atendimento médico.

## Compilar (GitHub, sem computador)
1. No repositório, crie `.github/workflows/build-casa.yml` com o conteúdo do `build-casa.yml`.
2. Suba o `Z-Casa-Converta.zip` na raiz. A compilação começa sozinha (aba Actions).
3. Quando ficar verde, baixe `Casa-APK` em Artifacts, extraia e instale o `Casa-Converta.apk`.

## Notas da versão
- Novo nome: Open House. Novo ícone.
- Casa animada com deveres, manutenção e responsáveis por parte.
- Comida, estoque de 6 meses, água potável, pets, veículos, primeiros socorros e emergência.
- Controle de gastos por categoria, contas fixas, metas e compras futuras.
- Português e espanhol.
- Cores: azul-marinho, verde-limão nos botões de destaque, branco e cinza-gelo.
- Páginas em Next.js (pasta `web/`): resumo do mês em `/next/` e ficha do imóvel para imprimir em `/next/ficha/`. Elas são compiladas pelo fluxo do GitHub; se essa etapa falhar, o app continua funcionando sem elas. Não consegui compilar o Next.js aqui, então essa parte não foi testada.
