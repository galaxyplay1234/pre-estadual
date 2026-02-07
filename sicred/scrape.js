const fs = require("fs");
const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");

const URL = "https://www.lchf.com.br/ClassificacaoJogos.aspx";

(async () => {
  const res = await fetch(URL);
  const html = await res.text();

  const dom = new JSDOM(html);
  const document = dom.window.document;

  // 🏆 Nome do campeonato
  const campeonato = [...document.querySelectorAll("h3.title-bg")]
    .map(h => h.textContent.trim())
    .find(t => t.includes("6ª COPA SICREDI LIVRE MASCULINO"));

  // ================= CLASSIFICAÇÃO =================
  const grupos = [];

  document.querySelectorAll(".label-grupo").forEach(label => {
    const nomeGrupo = label.textContent.replace("Grupo:", "").trim();
    const tabela = label.nextElementSibling.querySelector("table");
    if (!tabela) return;

    const times = [];

    tabela.querySelectorAll("tr").forEach((tr, i) => {
      if (i === 0) return;

      const td = tr.querySelectorAll("td");
      if (td.length < 11) return;

      times.push({
        posicao: Number(td[0].textContent.trim()),
        logo: td[1].querySelector("img")?.getAttribute("src") || null,
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

  // ================= JOGOS =================
  const jogos = [];

  const rodadaTexto =
    document.querySelector("div:contains('Rodada')")?.textContent ||
    document.body.textContent.match(/Rodada\s+\d+/)?.[0] ||
    "Rodada atual";

  document
    .querySelectorAll("table tr")
    .forEach(tr => {
      const td = tr.querySelectorAll("td");
      if (td.length < 6) return;

      const mandante = td[1]?.textContent.trim();
      const placarMandante = td[2]?.querySelector("input")?.value || null;
      const placarVisitante = td[3]?.querySelector("input")?.value || null;
      const visitante = td[4]?.textContent.trim();
      const campo = td[5]?.textContent.trim();
      const dataHora = td[6]?.textContent.trim();

      if (!mandante || !visitante) return;

      let data = null;
      let hora = null;

      if (dataHora?.includes(" ")) {
        [data, hora] = dataHora.split(" ");
      }

      jogos.push({
        rodada: rodadaTexto,
        mandante,
        visitante,
        gols_mandante: placarMandante ? Number(placarMandante) : null,
        gols_visitante: placarVisitante ? Number(placarVisitante) : null,
        campo,
        data,
        hora
      });
    });

  // ================= SALVAR =================
  const dados = { campeonato, grupos, jogos };

  fs.writeFileSync(
    "sicred/dados.json",
    JSON.stringify(dados, null, 2)
  );

  console.log("✅ Classificação + jogos atualizados");
})();