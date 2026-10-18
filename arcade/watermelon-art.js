/* Original Canvas artwork for Watermelon Garden. No emoji, fonts, images or game assets are used. */
(function(root){'use strict';
const P=root.WatermelonPhysics,{FRUITS:F,OUTLINES}=P,cache=new Map();
function path(c,points,r){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x*r,p.y*r):c.moveTo(p.x*r,p.y*r));c.closePath()}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()}
function leaf(c,x,y,size,angle=0){c.save();c.translate(x,y);c.rotate(angle);c.fillStyle='#5c9975';c.strokeStyle='#387958';c.lineWidth=size*.07;c.beginPath();c.moveTo(0,0);c.bezierCurveTo(-size*.1,-size*.7,size*.75,-size*.95,size,0);c.bezierCurveTo(size*.5,size*.25,size*.2,size*.2,0,0);c.fill();c.stroke();c.strokeStyle='#d2e7ad';c.beginPath();c.moveTo(size*.12,0);c.lineTo(size*.78,-size*.12);c.stroke();c.restore()}
function sprite(level){
 if(cache.has(level))return cache.get(level);const f=F[level],r=f.r,pad=r*.4+4,size=(r+pad)*2,scale=3,canvas=document.createElement('canvas');canvas.width=Math.ceil(size*scale);canvas.height=Math.ceil(size*scale);const c=canvas.getContext('2d');c.scale(scale,scale);c.translate(size/2,size/2);
 path(c,OUTLINES[level],r);const g=c.createLinearGradient(-r*.5,-r,r*.65,r);g.addColorStop(0,f.light);g.addColorStop(.42,f.color);g.addColorStop(1,f.dark);c.fillStyle=g;c.fill();c.save();c.clip();
 if(level===1){for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++)if((i+j)%2===0){c.save();c.translate(i*r*.34,j*r*.32);c.rotate(i*.25);ellipse(c,0,0,r*.043,r*.075,'#ffe8b7');c.restore()}}
 if(level===2){for(const [x,y,rr] of [[-.42,-.45,.42],[.27,-.5,.44],[-.6,.12,.43],[.04,.02,.49],[.58,.16,.43],[-.31,.59,.43],[.34,.62,.42]]){const g=c.createRadialGradient((x-.1)*r,(y-.13)*r,0,x*r,y*r,rr*r);g.addColorStop(0,'#cfb4f5');g.addColorStop(1,'#9370cb');c.fillStyle=g;c.beginPath();c.arc(x*r,y*r,rr*r,0,7);c.fill();c.strokeStyle='#8761b933';c.lineWidth=r*.035;c.stroke()}}
 if([3,4,6].includes(level)){for(let i=0;i<26;i++){const a=i*2.399,x=Math.cos(a)*Math.sqrt(i/26)*r*.88,y=Math.sin(a)*Math.sqrt(i/26)*r*.88;ellipse(c,x,y,r*.017,r*.02,level===6?'#ae96496b':'#c7753535')}}
 if(level===7){c.strokeStyle='#d7829a80';c.lineWidth=r*.025;c.beginPath();c.moveTo(0,-r*.9);c.bezierCurveTo(-r*.15,-r*.35,r*.16,r*.24,0,r*.83);c.stroke()}
 if(level===8){c.strokeStyle='#b58c3f5c';c.lineWidth=r*.025;for(let i=-3;i<=3;i++){c.beginPath();c.moveTo(-r,i*r*.4-r);c.lineTo(r,i*r*.4+r);c.stroke();c.beginPath();c.moveTo(-r,i*r*.4+r);c.lineTo(r,i*r*.4-r);c.stroke()}}
 if(level===9){c.strokeStyle='#e6edb5';c.lineWidth=r*.025;for(let i=-4;i<=4;i++){c.beginPath();c.moveTo(-r,i*r*.3-r);c.bezierCurveTo(-r*.25,i*r*.3-r*.3,r*.4,i*r*.3+r*.3,r,i*r*.3+r);c.stroke();c.beginPath();c.moveTo(-r,i*r*.3+r);c.bezierCurveTo(-r*.4,i*r*.3+r*.3,r*.25,i*r*.3-r*.3,r,i*r*.3-r);c.stroke()}}
 if(level===10){c.strokeStyle='#347f5d';c.lineWidth=r*.125;c.lineCap='round';for(let i=-2;i<=2;i++){const x=i*r*.48;c.beginPath();c.moveTo(x*.7,-r*1.1);c.bezierCurveTo(x+r*.22,-r*.3,x-r*.23,r*.35,x*.7,r*1.1);c.stroke()}}
 // A soft glint stays within the physical silhouette. No transparent collision halo.
 c.save();c.translate(-r*.43,-r*.51);c.rotate(-.5);ellipse(c,0,0,r*.12,r*.23,'#ffffff65');ellipse(c,r*.2,-r*.05,r*.045,r*.07,'#ffffff88');c.restore();
 const shade=c.createRadialGradient(0,0,r*.6,0,0,r*1.02);shade.addColorStop(0,'#00000000');shade.addColorStop(1,'#643e3012');c.fillStyle=shade;c.fillRect(-r*1.2,-r*1.2,r*2.4,r*2.4);c.restore();
 path(c,OUTLINES[level],r);c.strokeStyle=f.dark;c.lineWidth=Math.max(.8,r*.025);c.stroke();
 if([0,5,6].includes(level)){c.strokeStyle='#826044';c.lineWidth=Math.max(1,r*.055);c.lineCap='round';c.beginPath();c.moveTo(0,-r*.88);c.quadraticCurveTo(-r*.06,-r*1.12,r*.08,-r*1.24);c.stroke();leaf(c,r*.03,-r*1.06,r*.38,-.24)}
 if([1,3,4].includes(level)){const n=level===4?4:5;c.fillStyle='#5f9872';c.beginPath();for(let i=0;i<n*2;i++){const a=-Math.PI/2+i*Math.PI/n,rr=(i%2?r*.12:r*.3);const x=Math.cos(a)*rr,y=-r*.85+Math.sin(a)*rr*.65;i?c.lineTo(x,y):c.moveTo(x,y)}c.closePath();c.fill();if(level===3)leaf(c,r*.08,-r*.93,r*.35,-.25)}
 if(level===2){leaf(c,-r*.05,-r*.93,r*.48,-.3);c.strokeStyle='#6b9060';c.lineWidth=r*.05;c.beginPath();c.arc(r*.34,-r*.98,r*.14,0,Math.PI*1.7);c.stroke()}
 if(level===8){for(let i=-2;i<=2;i++){c.fillStyle=i%2?'#5a9978':'#77ae85';c.beginPath();c.moveTo(i*r*.12-r*.13,-r*.83);c.quadraticCurveTo(i*r*.22,-r*1.38,i*r*.21+r*.05,-r*1.23);c.lineTo(i*r*.12+r*.15,-r*.84);c.fill()}}
 cache.set(level,{canvas,size});return cache.get(level);
}
function draw(c,level,x,y,angle=0,alpha=1,time=0){const f=F[level],r=f.r,s=sprite(level);c.save();c.globalAlpha=alpha;c.translate(x,y);c.rotate(angle);c.drawImage(s.canvas,-s.size/2,-s.size/2,s.size,s.size);
 const blink=((time+level*379)%5100)<110;c.strokeStyle='#594539';c.fillStyle='#594539';c.lineCap='round';c.lineWidth=Math.max(1,r*.045);
 for(const side of [-1,1]){const xx=side*r*.23,yy=r*.04;if(blink){c.beginPath();c.moveTo(xx-r*.045,yy);c.lineTo(xx+r*.045,yy);c.stroke()}else ellipse(c,xx,yy,r*.055,r*.078,'#594539');ellipse(c,side*r*.4,r*.18,r*.12,r*.055,'#f5828a55')}
 c.beginPath();c.moveTo(-r*.09,r*.2);c.quadraticCurveTo(0,r*.34,r*.09,r*.2);c.stroke();c.restore();}
function thumbnail(canvas,level){const c=canvas.getContext('2d');canvas.width=120;canvas.height=120;c.clearRect(0,0,120,120);c.save();c.translate(60,66);const scale=43/(F[level].r*1.2);c.scale(scale,scale);draw(c,level,0,0,0,1,500);c.restore();canvas.setAttribute('aria-label',F[level].name)}
root.WatermelonArt={draw,thumbnail,sprite};
})(globalThis);
