# Landsat Name - Modo Nerd Dashboard

Userscript independente que adiciona um painel interno com estatísticas, galeria e exploração de dados à ferramenta pública **Your Name in Landsat**, da NASA.

> Projeto independente. Não é afiliado, mantido, endossado ou patrocinado pela NASA.

## O que o script faz

O script adiciona um botão flutuante **Modo Nerd** na página:

https://science.nasa.gov/specials/your-name-in-landsat/

Ao clicar, ele abre um dashboard com:

- total de imagens encontradas;
- total de países inferidos;
- cobertura global do alfabeto;
- ranking de países com mais imagens;
- ranking de países com mais letras únicas;
- ranking de letras com mais variações;
- inspector por país;
- galeria agrupada por país;
- lightbox para visualizar imagens;
- exportação dos dados em JSON;
- cópia de resumo em texto.

## Como instalar

### Opção 1 — Tampermonkey

1. Instale o Tampermonkey no navegador.
2. Abra o arquivo `landsat-name-nerd-dashboard.user.js`.
3. Clique em **Raw**.
4. O Tampermonkey deverá detectar o userscript.
5. Clique em **Install**.

Depois disso, acesse:

https://science.nasa.gov/specials/your-name-in-landsat/

O botão **Modo Nerd** aparecerá no canto inferior direito.

## Privacidade

Este script roda localmente no navegador do usuário.

Ele não envia dados para servidores externos próprios, não coleta dados pessoais e não usa backend.

## Limitações

A identificação de países é inferida a partir dos títulos e locais existentes na ferramenta original. Por isso, alguns países podem aparecer como `Unknown` ou podem exigir ajustes manuais no futuro.

## Créditos

As imagens e dados originais pertencem às respectivas fontes indicadas na ferramenta Your Name in Landsat, incluindo páginas e serviços ligados à NASA, USGS, Sentinel Hub e outros links exibidos pela própria ferramenta.

Este projeto apenas cria uma camada de análise e visualização sobre a página pública.

## Licença

MIT.
