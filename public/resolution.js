(() => {
 const stage=document.querySelector('#overlay-stage');
 function resize(){
  const scale=Math.min(window.innerWidth/2560,window.innerHeight/1440);
  stage.style.transform=`scale(${scale})`;
  stage.style.left=`${(window.innerWidth-2560*scale)/2}px`;
 }
 resize();window.addEventListener('resize',resize);
})();
