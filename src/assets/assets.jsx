
export const assetList = {
  menuBg: "./sprites/bg.gif", 
  menuPanel: "./elements/menu-panel.png",
  startBtn: "./elements/startbtn-main.png",
  instructionsBtn: "./elements/infobtn-main.png",
  dataBtn: "./elements/databtn-main.png",
  yjhGif: "./sprites/yjh.gif",
  
  goPanel:"./elements/go-panel.png",
  retryBtn: "./elements/retrybtn-go.png",
  menuBtn3:  "./elements/menubtn-go.png",
  
  dataPanel:"./elements/data-panel.png",
  menuBtn1: "./elements/menubtn-data.png",

  infoPanel: "./elements/info-panel.png",
  menuBtn2: "./elements/menubtn-info.png",

  gameBg: "./sprites/bg1.png",
  player: "./sprites/yjh.png",
  ground: "./sprites/road.jpeg",
};

export function preloadAssets(list) {
  const loaded = {};
  const promises = Object.entries(list).map(([key, src]) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        loaded[key] = img;
        resolve();
      };
      img.onerror = reject;
    });
  });
  return Promise.all(promises).then(() => loaded);
}
