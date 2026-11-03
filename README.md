# Casa+ | Gestão do lar

Aplicativo Android com painel familiar acessível por navegador na **mesma rede Wi-Fi**. O celular Android do administrador hospeda o painel e mantém o banco local.

## Versão renovada (novembro/2026)
- **Início**: dashboard responsivo com despesas do mês, orçamento, compras pendentes, itens comprados, escala, cardápio do dia, últimos gastos e atalhos.
- **Escala**: rodízio semanal de quem faz as compras; administrador pode trocar uma semana.
- **Compras**: itens com quantidade, histórico de comprados e possibilidade de desfazer.
- **Finanças**: registro de gastos por pessoa com categorias (mercado, energia, água, internet, aluguel, gás, limpeza, saúde, transporte, manutenção e outras), resumo, meta e divisão.
- **Cardápio**: planeje café, almoço, lanche e jantar para todos os dias. Administração pode editar; família pode consultar e adicionar ingredientes informados à lista de compras.
- **Pessoas**: cadastro, ordem do rodízio, meta mensal e acesso de administrador por PIN.
- Banco SQLite migrado da v1 para a v2 sem apagar pessoas, compras ou despesas anteriores.

## Sincronização dos celulares pela mesma rede Wi-Fi
- O celular Android do administrador continua sendo o **servidor da casa**: abra o aplicativo e mantenha o servidor ligado.
- Os demais celulares (Android ou iPhone) abrem **o mesmo endereço local** fornecido pelo aplicativo, no navegador, sem precisar instalar o APK.
- Cada mudança na lista de compras ou nas despesas fica no banco central do administrador. As outras telas consultam as atualizações aproximadamente **a cada 2,5 segundos** enquanto estão abertas.
- O painel mostra **Sincronizado** ou **Sem conexão**. Se a pessoa estiver digitando, a tela não sobrescreve o campo: aparece **Novidades · atualizar**, com atualização após sair do campo.
- Não é necessário que todos abram o painel ao mesmo tempo; o servidor precisa permanecer acessível na rede. Wi-Fi com isolamento de clientes (como redes de convidados) pode bloquear o acesso entre celulares.
- A aba **Colaboração** resume a semana: itens efetivamente marcados como comprados, despesas e pedidos na lista por pessoa. Compras registradas à noite entram na respectiva semana. "Sem registro" não significa que a pessoa não ajudou fora do aplicativo.

## Acesso e segurança
- Somente o aplicativo Android administrador mantém os dados. Outros celulares no mesmo Wi-Fi acessam o endereço IP mostrado pelo aplicativo. Acessar de fora de casa exige infraestrutura adicional.
- O servidor **precisa permanecer ligado** no celular Android. Se o telefone for desligado, sair da rede ou o serviço parar, o painel não ficará acessível.
- Qualquer pessoa com acesso à rede pode consultar o painel, adicionar itens e registrar gastos; as operações administrativas exigem PIN. **Não use em Wi-Fi público**.
- Não há sincronização na nuvem, backup automático, cobrança online nem publicação para iOS.
- Não colocar dados pessoais reais em capturas ou testes.

## Como testar
1. Em **Actions**, abra o workflow **Validar Casa+ renovado** na branch `main` (ou branch de desenvolvimento).
2. Confirme as etapas "Validar JavaScript do painel" e "Compilar APK Android" concluídas.
3. Baixe o artefato `Casa-Plus-Painel-2026-APK`, extraia o ZIP e instale o APK em um Android compatível.
4. Abra o aplicativo, ligue o servidor local, entre no painel, cadastre pessoas, faça uma compra e salve uma refeição.
5. Com outro celular no mesmo Wi-Fi, abra no navegador o endereço mostrado pelo administrador.

O artefato é **APK de teste**, não release comercial; exigem-se testes em dispositivo real e revisão de segurança antes de distribuir amplamente.

## Código-fonte
A versão editável do aplicativo está em `source/CasaConverta/`. O ZIP original `Z-Casa-Converta.zip` foi preservado somente como referência/backup e não é mais a fonte da versão renovada.
