import fs from "node:fs/promises";

const CHANNEL_ID = "UCq1yARQl1-6emmxLu0E3cSQ"; // <-- hardcoded
const README_PATH = "README.md";
const START_MARKER = "<!-- YOUTUBE:START -->";
const END_MARKER = "<!-- YOUTUBE:END -->";

async function getLatestVideos(channelId) {
  const response = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
  );

  if (!response.ok) {
    throw new Error(`Could not fetch YouTube feed: ${response.status}`);
  }

  const xml = await response.text();
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];

  return entries
    .slice(0, 4)
    .map((entry) => {
      const content = entry[1];

      const title = content
        .match(/<title>([\s\S]*?)<\/title>/)?.[1]
        ?.replace(/<!\[CDATA\[|\]\]>/g, "")
        .trim();

      const videoId = content.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1];

      return { title, videoId };
    })
    .filter((v) => v.videoId);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function createMarkdown(videos) {
  if (videos.length === 0) {
    return `${START_MARKER}

<div align="center">

*No videos available.*

</div>

${END_MARKER}`;
  }

  const rows = [];
  for (let i = 0; i < videos.length; i += 4) {
    const rowVideos = videos.slice(i, i + 4);

    const cells = rowVideos
      .map(
        ({ title, videoId }) => `
<td width="25%" align="center" valign="top">
  <a href="https://www.youtube.com/watch?v=${videoId}">
    <img
      src="https://i.ytimg.com/vi/${videoId}/hqdefault.jpg"
      alt="${escapeHtml(title || "YouTube Video")}"
      width="100%"
    />
  </a>
  <br />
  <sub>${escapeHtml(title || "")}</sub>
</td>`,
      )
      .join("");

    const emptyCells = 4 - rowVideos.length;
    const fillers = Array(emptyCells)
      .fill(`<td width="25%" align="center" valign="top">&nbsp;</td>`)
      .join("");

    rows.push(`<tr>${cells}${fillers}</tr>`);
  }

  return `${START_MARKER}

<table width="100%" style="width:100%; table-layout:fixed;" cellspacing="12" cellpadding="0">
${rows.join("\n")}
</table>

${END_MARKER}`;
}

async function updateReadme() {
  const videos = await getLatestVideos(CHANNEL_ID);

  const readme = await fs.readFile(README_PATH, "utf8");
  const markdown = createMarkdown(videos);

  const sectionPattern = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`);

  const updatedReadme = sectionPattern.test(readme)
    ? readme.replace(sectionPattern, markdown)
    : `${readme.trim()}\n\n${markdown}\n`;

  await fs.writeFile(README_PATH, updatedReadme);
  console.log(`Updated README with ${videos.length} YouTube video(s).`);
}

updateReadme().catch((error) => {
  console.error(error);
  process.exit(1);
});
