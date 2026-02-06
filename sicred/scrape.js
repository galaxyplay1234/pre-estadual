const fs = require("fs");
const axios = require("axios");
const cheerio = require("cheerio");

const URL = "https://www.lchf.com.br/ClassificacaoJogos.aspx";
const BASE = "https://www.lchf.com.br/";

(async () => {
  const { data: html } = await axios.get(URL);
  const $ = cheerio.load(html);

  const campeonato = $("h3.title-bg").first().text().trim();
  const grupos = [];

  $(".label-grupo").each((_, el) => {
    const nomeGrupo = $(el).text().replace("Grupo:", "").trim();
    const tabela = [];

    const table = $(el).nextAll("div").find("table").first();

    table.find("tr").slice(1).each((_, tr) => {
      const td = $(tr).find("td");
      if (td.length < 11) return;

      tabela.push({
        posicao: Number(td.eq(0).text().trim()),
        logo: BASE + td.eq(1).find("img").attr("src"),
        nome: td.eq(2).text().trim(),
        pontos: Number(td.eq(3).text()),
        jogos: Number(td.eq(4).text()),
        vitorias: Number(td.eq(5).text()),
        empates: Number(td.eq(6).text()),
        derrotas: Number(td.eq(7).text()),
        gols_pro: Number(td.eq(8).text()),
        gols_contra: Number(td.eq(9).text()),
        saldo: Number(td.eq(10).text())
      });
    });

    grupos.push({ nome: nomeGrupo, tabela });
  });

  fs.writeFileSync(
    "dados.json",
    JSON.stringify({ campeonato, grupos }, null, 2)
  );

  console.log("Dados atualizados");
})();