import 'dotenv/config'
import * as fs from 'fs/promises'
import * as path from 'path'
var timer=parseInt(process.env.INTERVAL_SEC);
if(timer>1)
    setInterval(start,timer*1000)
else
    console.error("Can't have INTERVAL_SEC be smaller than 1")
async function start()
{
console.log("Scanning...")
var series=await getJsonData("series") as any[];
var finished=series.filter(serie=>serie.status.toLowerCase() === 'ended' && serie.statistics.episodeCount === serie.statistics.episodeFileCount)
console.log("Scan complete!")
finished.forEach(async serie=>{
    console.log("Started moving: "+serie.path)
    var name=path.basename(serie.path);
    if(await moveDirectory(path.join(process.env.ORIGINE_DIR,name),path.join(process.env.DESTINATION_DIR,name)))
    {
        untrackSeries(serie.id)
    }
})

}
async function getJsonData(endpoint:string)
{
    return new Promise<any>((res,err)=>{
        fetch(process.env.SONARR_URL+"/api/v3/"+endpoint,{headers: {'X-Api-Key': process.env.SONARR_KEY}}).then(async v=>{
            if(v.status==200)
                res(await v.json());
            else
                err({code:v.status,text:v.statusText});
            })
    });

}
/**
 * Supprime une série de Sonarr (optionnellement avec ses fichiers).
 * @param seriesId ID de la série Sonarr
 * @param deleteFiles Supprimer aussi les fichiers du disque
 */
async function untrackSeries(seriesId: number): Promise<void> {
  try {
        await fetch(`${process.env.SONARR_URL}/api/v3/series/${seriesId}?deleteFiles=false`,{headers: {'X-Api-Key': process.env.SONARR_KEY}});
    console.log(`✅ Untracked ${seriesId}`);
  } catch (error) {
    console.error(`❌ Failed to untrack  ${seriesId} :`, error.message);
  }
}
/**
 * Déplace un dossier et tout son contenu récursivement vers une autre destination.
 * @param sourcePath Chemin du dossier source
 * @param destPath Chemin de destination
 */
async function moveDirectory(sourcePath: string, destPath: string): Promise<boolean> {
  try {
    // Crée le dossier destination s'il n'existe pas
    await fs.mkdir(destPath, { recursive: true });

    const items = await fs.readdir(sourcePath, { withFileTypes: true });

    for (const item of items) {
      const sourceItemPath = path.join(sourcePath, item.name);
      const destItemPath = path.join(destPath, item.name);

      if (item.isDirectory()) {
        // Appel récursif pour les sous-dossiers
        await moveDirectory(sourceItemPath, destItemPath);
      } else {
        // Déplacement des fichiers
        await fs.rename(sourceItemPath, destItemPath);
      }
    }

    // Supprime le dossier source une fois tout déplacé
    await fs.rmdir(sourcePath);
    console.log(`📂 Folder moved from "${sourcePath}" to "${destPath}"`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to move "${sourcePath}" :`, err);
    return false;
  }
}