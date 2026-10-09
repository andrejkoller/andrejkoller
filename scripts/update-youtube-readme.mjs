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
    .filter((v) => v.videoId); // leere Einträge rausfiltern
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
    return `${START_MARKER}\n\n<div align="center">\n\n*Noch keine Videos vorhanden.*\n\n</div>\n\n${END_MARKER}`;
  }

  const cards = videos
    .map(
      ({
        title,
        videoId,
      }) => `  <a href="https://www.youtube.com/watch?v=${videoId}">
    <img src="https://i.ytimg.com/vi/${videoId}/hqdefault.jpg" width="25%" alt="${escapeHtml(title || "YouTube Video")}">
  </a>`,
    )
    .join("\n");

  return `${START_MARKER}

<div align="center">

${cards}

</div>

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
