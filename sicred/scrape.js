const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const URL = "https://www.lchf.com.br/ClassificacaoJogos.aspx";

(async () => {
  const res = await fetch(URL);
  const html = await res.text();

  const dom = new JSDOM(html);
  const document = dom.window.document;

  const campeonato = document.querySelector("h3.title-bg")?.textContent.trim();

  const grupos = [];

  document.querySelectorAll(".label-grupo").forEach(label => {
    const nomeGrupo = label.textContent.replace("Grupo:", "").trim();
    const tabela = label.nextElementSibling.querySelector("table");

    const times = [];

    tabela.querySelectorAll("tr").forEach((tr, i) => {
      if (i === 0) return;

      const td = tr.querySelectorAll("td");
      times.push({
        posicao: Number(td[0].textContent.trim()),
        logo: td[1].querySelector("img")?.getAttribute("src"),
        nome: td[2].textContent.trim(),
        pontos: Number(td[3].textContent),
        jogos: Number(td[4].textContent),
        vitorias: Number(td[5].textContent),
        empates: Number(td[6].textContent),
        derrotas: Number(td[7].textContent),
        gols_pro: Number(td[8].textContent),
        gols_contra: Number(td[9].textContent),
        saldo: Number(td[10].textContent)
      });
    });

    grupos.push({ nome: nomeGrupo, tabela: times });
  });

  const dados = { campeonato, grupos };

  fs.writeFileSync("sicred/dados.json", JSON.stringify(dados, null, 2));
  console.log("✅ dados.json atualizado");
})();