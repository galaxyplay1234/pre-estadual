const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const URL = "https://www.lchf.com.br/ClassificacaoJogos.aspx";
const NOME_CAMPEONATO = "6ª COPA SICREDI LIVRE MASCULINO";

(async () => {
  try {
    const res = await fetch(URL);
    const html = await res.text();

    const dom = new JSDOM(html);
    const document = dom.window.document;

    // 1️⃣ acha o campeonato certo
    const h3 = [...document.querySelectorAll("h3.title-bg")]
      .find(el => el.textContent.trim() === NOME_CAMPEONATO);

    if (!h3) {
      console.error("❌ Campeonato não encontrado");
      process.exit(1);
    }

    // 2️⃣ o container que contém TODOS os grupos
    const containerGrupos = h3.nextElementSibling;
    if (!containerGrupos) {
      console.error("❌ Container de grupos não encontrado");
      process.exit(1);
    }

    const grupos = [];

    // 3️⃣ percorre todos os grupos A, B, C, D, E
    containerGrupos.querySelectorAll(".label-grupo").forEach(label => {
      const nomeGrupo = label.textContent
        .replace("Grupo:", "")
        .trim();

      const tabela = label.nextElementSibling?.querySelector("table");
      if (!tabela) return;

      const times = [];

      tabela.querySelectorAll("tr").forEach((tr, i) => {
        if (i === 0) return;

        const td = tr.querySelectorAll("td");
        if (td.length < 11) return;

        times.push({
          posicao: Number(td[0].textContent.trim()),
          logo: td[1].querySelector("img")
            ? "https://www.lchf.com.br/" +
              td[1].querySelector("img").getAttribute("src")
            : null,
          nome: td[2].textContent.trim(),
          pontos: Number(td[3].textContent.trim()),
          jogos: Number(td[4].textContent.trim()),
          vitorias: Number(td[5].textContent.trim()),
          empates: Number(td[6].textContent.trim()),
          derrotas: Number(td[7].textContent.trim()),
          gols_pro: Number(td[8].textContent.trim()),
          gols_contra: Number(td[9].textContent.trim()),
          saldo: Number(td[10].textContent.trim())
        });
      });

      grupos.push({
        nome: nomeGrupo,
        tabela: times
      });
    });

    const dados = {
      campeonato: NOME_CAMPEONATO,
      atualizado_em: new Date().toISOString(),
      grupos
    };

    fs.writeFileSync(
      "sicred/dados.json",
      JSON.stringify(dados, null, 2),
      "utf8"
    );

    console.log(`✅ ${grupos.length} grupos salvos com sucesso`);

  } catch (err) {
    console.error("❌ Erro no scraper:", err);
    process.exit(1);
  }
})();