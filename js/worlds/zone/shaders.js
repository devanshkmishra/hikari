// 区域 — GLSL. One raymarched program per place (compiled lazily), a raster layer for
// grass, gauze, particles, decals, fire and rain that shares the same camera and depth,
// and one film post pass (sepia ↔ the Zone's muted colour, shimmer, grain).

const CAM = /* glsl */`
uniform vec3 uCam, uF, uR, uU;
uniform float uFocal, uAspect, uNear, uFar;
uniform vec3 uFogCol;
uniform float uFogDen, uFogK;
`;

const NOISE = /* glsl */`
float h11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}
float h12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
vec2 h22(vec2 p){vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));p3+=dot(p3,p3.yzx+33.33);return fract((p3.xx+p3.yz)*p3.zy);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(h12(i),h12(i+vec2(1.,0.)),u.x),mix(h12(i+vec2(0.,1.)),h12(i+vec2(1.,1.)),u.x),u.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vn(p);p=mat2(1.6,1.2,-1.2,1.6)*p+vec2(3.1,1.7);a*=.5;}return s;}
float fbm3(vec2 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*vn(p);p=mat2(1.6,1.2,-1.2,1.6)*p+vec2(3.1,1.7);a*=.5;}return s;}
`;

const HFOG = /* glsl */`
float fogAmt(vec3 ro, vec3 rd, float t){
  float a = uFogDen*exp(-uFogK*max(ro.y, 0.));
  float b = uFogK*rd.y;
  float f = abs(b) > 1e-4 ? a*(1.-exp(-b*t))/b : a*t;
  return 1.-exp(-max(f, 0.));
}
`;

const PRELUDE = /* glsl */`#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 uRes;
uniform float uTime;
${CAM}
uniform vec4 uAnom[6];
uniform vec4 uFire;
uniform vec4 uP0;
uniform vec4 uP1;
uniform vec4 uRip[8];
uniform float uRain;
uniform sampler2D uTex0;
#define PI 3.14159265
${NOISE}
${HFOG}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float sdBox(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
float sdRBox(vec3 p,vec3 b,float r){vec3 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}
float sdCyl(vec3 p,float r,float h){vec2 d=abs(vec2(length(p.xz),p.y))-vec2(r,h);return min(max(d.x,d.y),0.)+length(max(d,0.));}
float sdCap(vec3 p,vec3 a,vec3 b,float r){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-r;}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
vec2 opU(vec2 a,vec2 b){return a.x<b.x?a:b;}
float projDepth(float zv){float A=(uFar+uNear)/(uFar-uNear),B=-2.*uFar*uNear/(uFar-uNear);return clamp(.5*(A+B/max(zv,uNear))+.5,0.,1.);}
float anomMark(vec2 xz){
  float m=0.;
  for(int i=0;i<6;i++){vec4 a=uAnom[i];if(a.w<=0.)continue;float d=length(xz-a.xy)/a.z;
    m=max(m,a.w*smoothstep(1.05,0.7,d)*(0.55+0.45*smoothstep(0.35,0.95,d)));}
  return m;
}
// falling rain on wet ground: expanding rings in a jittered grid
float rainRings(vec2 xz, float amt){
  if(amt<=0.) return 0.;
  float s=0.;
  for(int k=0;k<2;k++){
    vec2 q=xz*(2.2+float(k)*1.3)+float(k)*7.1;
    vec2 i=floor(q), f=fract(q)-.5;
    vec2 o=h22(i)-.5; float ph=fract(uTime*0.9+h12(i+3.));
    float d=length(f-o*0.6);
    s+=sin(d*40.-ph*14.)*smoothstep(ph*0.5,ph*0.5-0.08,d)*smoothstep(0.,0.2,ph)*(1.-ph);
  }
  return s*amt;
}
`;

const POSTMAP = /* glsl */`
vec3 calcNormal(vec3 p,float t){
  float e=0.0006*t+0.0008; vec2 k=vec2(1.,-1.);
  return normalize(k.xyy*map(p+k.xyy*e).x+k.yyx*map(p+k.yyx*e).x+k.yxy*map(p+k.yxy*e).x+k.xxx*map(p+k.xxx*e).x);
}
float calcAO(vec3 p,vec3 n){
  float occ=0.,sca=1.;
  for(int i=0;i<4;i++){float h=.03+.17*float(i);float d=map(p+n*h).x;occ+=(h-d)*sca;sca*=.72;}
  return clamp(1.-1.6*occ,0.,1.);
}
`;

const MAIN = /* glsl */`
void main(){
  vec2 ndc=gl_FragCoord.xy/uRes*2.-1.;
  vec3 rd=normalize(uF*uFocal+uR*(ndc.x*uAspect)+uU*ndc.y);
  vec3 ro=uCam;
  float tmax=FAR_T, tp=-1.;
#ifdef FLOOR_Y
  if(rd.y<-1e-4){tp=(FLOOR_Y-ro.y)/rd.y;tmax=min(tmax,tp);}
#endif
  float t=0.03, m=-1.;
  for(int i=0;i<STEPS;i++){
    vec2 h=map(ro+rd*t);
    if(h.x<0.0006*t+0.0006){m=h.y;break;}
    t+=h.x*STEP_K;
    if(t>tmax)break;
  }
#ifdef FLOOR_Y
  if(m<0.&&tp>0.&&tp<FAR_T){t=tp;m=0.;}
#endif
  vec3 col; float depth=1.;
  if(m<0.){col=sky(ro,rd);t=FAR_T;}
  else{
    vec3 p=ro+rd*t;
    vec3 n;
#ifdef FLOOR_Y
    n = m<0.5 ? vec3(0.,1.,0.) : calcNormal(p,t);
#else
    n = calcNormal(p,t);
#endif
    col=shade(p,n,rd,m,t);
    depth=projDepth(t*dot(rd,uF));
  }
  col=post(col,ro,rd,t,m);
  fragColor=vec4(max(col,0.),1.);
  gl_FragDepth=depth;
}
`;

// ───────────────────────────────────────────────────────────── 01 platform
const PLATFORM = {
  map: /* glsl */`
#define STEPS 110
#define FAR_T 270.
#define STEP_K 0.92
#define FLOOR_Y 0.0
vec4 birch(vec3 p){
  const float C=6.;
  vec2 c=floor(p.xz/C); vec2 hh=h22(c+17.);
  vec2 ctr=(c+.5+(hh-.5)*.5)*C;
  float zone = step(19.,ctr.y)+step(ctr.y,-13.)+step(7.,abs(ctr.x))*step(6.,ctr.y);
  float grove=vn(c*0.45+3.7);
  float pres=step(0.25+0.6*(1.-grove),hh.x)*step(0.5,zone);
  vec3 q=p-vec3(ctr.x,0.,ctr.y);
  q.xz-=(hh-.5)*q.y*0.05;
  float r=0.08+0.16*hh.y*hh.y;
  float d=pres>0.5?length(q.xz)-r:1e3;
  vec2 f=fract(p.xz/C); float bd=min(min(f.x,1.-f.x),min(f.y,1.-f.y))*C;
  return vec4(min(d,bd+0.7),q.x,q.z,hh.y);
}
vec2 map(vec3 p){
  vec2 res=vec2(1e3,-1.);
  float plat=sdBox(p-vec3(0.,0.4,-0.1),vec3(90.,0.4,1.5));
  float ramp=max(sdBox(p-vec3(0.,0.4,2.4),vec3(1.7,0.4,1.0)),dot(p-vec3(0.,0.8,1.4),vec3(0.,0.9285,0.3714)));
  float plat2=sdBox(p-vec3(0.,0.4,-7.7),vec3(90.,0.4,1.1));
  res=opU(res,vec2(min(min(plat,ramp),plat2),1.));
  float tz=p.z>-4.1?p.z+3.0:p.z+5.2;
  float rails=sdBox(vec3(p.x,p.y-0.12,abs(tz)-0.53),vec3(120.,0.06,0.035));
  float sx=mod(p.x,0.62)-0.31;
  float sl=sdBox(vec3(sx,p.y-0.03,tz),vec3(0.1,0.05,1.05));
  res=opU(res,vec2(rails,2.));
  res=opU(res,vec2(sl,3.));
  vec3 fp=p-vec3(0.,0.8,1.32);
  float seg=floor(fp.x/2.5+0.5); float fx=fp.x-seg*2.5;
  float broken=step(0.62,h11(seg*7.31+2.));
  float posts=sdBox(vec3(fx,fp.y-0.6,fp.z),vec3(0.035,0.6,0.035));
  float bars=min(sdBox(vec3(fp.x,fp.y-1.05,fp.z),vec3(90.,0.022,0.018)),sdBox(vec3(fp.x,fp.y-0.55,fp.z),vec3(90.,0.022,0.018)));
  bars=max(bars,abs(fx)-mix(1.3,0.35,broken));
  float fence=max(min(posts,bars),1.95-abs(p.x));
  res=opU(res,vec2(fence,4.));
  vec3 sq=p-vec3(1.2,2.45,-7.25);
  res=opU(res,vec2(sdBox(sq,vec3(1.1,0.38,0.025)),5.));
  res=opU(res,vec2(sdBox(vec3(abs(sq.x)-0.9,p.y-1.62,sq.z+0.05),vec3(0.04,0.82,0.04)),6.));
  vec3 bq=p-vec3(-4.6,0.8,0.55);
  float bench=sdBox(bq-vec3(0.,0.42,0.),vec3(0.9,0.025,0.2));
  bench=min(bench,sdBox(bq-vec3(0.,0.7,0.19),vec3(0.9,0.12,0.02)));
  bench=min(bench,sdBox(vec3(abs(bq.x)-0.75,bq.y-0.21,bq.z),vec3(0.03,0.21,0.18)));
  vec3 lq=p-vec3(6.2,0.8,1.0);
  float lamp=sdCyl(lq-vec3(0.,1.9,0.),0.055,1.9);
  lamp=min(lamp,sdCap(lq,vec3(0.,3.75,0.),vec3(0.,3.9,-0.7),0.035));
  lamp=min(lamp,sdBox(lq-vec3(0.,3.82,-0.78),vec3(0.12,0.05,0.22)));
  res=opU(res,vec2(min(bench,lamp),9.));
  vec4 b=birch(p);
  res=opU(res,vec2(b.x,7.));
  vec2 pd=vec2(-0.2149,0.9766);
  vec2 rel=p.xz-vec2(-7.5,10.);
  float al=dot(rel,pd), ac=dot(rel,vec2(pd.y,-pd.x));
  float cA=floor(al/24.+0.5); float la=al-cA*24.;
  float pole=al>-6.?min(sdCyl(vec3(ac,p.y-5.,la),0.12,5.),sdBox(vec3(ac,p.y-9.3,la),vec3(1.0,0.06,0.07))):1e3;
  res=opU(res,vec2(pole,9.));
  if(uP0.y>0.01){
    vec3 tq=p-vec3(uP0.x+10.2,1.9,-3.0);
    res=opU(res,vec2(sdRBox(tq,vec3(10.0,1.5,1.38),0.09),10.));
  }
  float far=88.-p.z;
  if(far<res.x){
    float fac=sdBox(p-vec3(-24.,8.,118.),vec3(26.,8.,10.));
    fac=min(fac,max(sdBox(p-vec3(-24.,17.1,118.),vec3(26.,1.1,10.)),(p.y-16.-2.2*fract((p.x+50.)/4.))*0.8));
    fac=min(fac,sdBox(p-vec3(10.,13.,126.),vec3(9.,13.,8.)));
    fac=min(fac,sdCyl(p-vec3(-6.,24.,110.),1.7,24.));
    fac=min(fac,sdCyl(p-vec3(-13.,20.,112.),1.4,20.));
    fac=min(fac,sdCyl(p-vec3(34.,15.,96.),3.6,2.4));
    fac=min(fac,sdBox(vec3(abs(p.x-34.)-2.5,p.y-6.5,abs(p.z-96.)-2.5),vec3(0.15,6.5,0.15)));
    fac=min(fac,sdBox(p-vec3(-60.,90.,250.),vec3(9.,90.,9.)));
    res=opU(res,vec2(fac,8.));
  }
  return res;
}
`,
  shade: /* glsl */`
vec3 skyCol(vec3 rd){
  float y=clamp(rd.y,0.,1.);
  vec3 c=mix(uFogCol,vec3(0.84,0.83,0.79),pow(y,0.5));
  vec2 cu=rd.xz/(rd.y+0.2);
  c*=0.93+0.1*fbm3(cu*0.8+vec2(uTime*0.004,0.));
  return c;
}
vec3 sky(vec3 ro,vec3 rd){return skyCol(rd);}
vec3 lit(vec3 alb,vec3 n,float ao){
  vec3 kd=normalize(vec3(-0.35,0.85,0.4));
  float hemi=0.5+0.5*n.y;
  vec3 amb=mix(vec3(0.26,0.25,0.21),vec3(0.82,0.81,0.77),hemi);
  float dif=max(dot(n,kd),0.);
  return alb*(amb*(0.35+0.65*ao)*0.95+vec3(1.,0.96,0.88)*dif*0.32*ao);
}
vec3 birchBark(vec3 p){
  vec4 b=birch(p);
  float a=atan(b.z,b.y);
  vec2 bu=vec2(a*2.,p.y);
  float lent=smoothstep(0.62,0.75,vn(vec2(bu.x*1.5,bu.y*9.)))*smoothstep(0.3,0.6,vn(bu*vec2(1.,0.7)));
  vec3 c=vec3(0.8,0.79,0.74)*(0.85+0.15*vn(bu*vec2(3.,20.)));
  c=mix(c,vec3(0.08,0.07,0.06),lent);
  c=mix(c,vec3(0.13,0.12,0.1),smoothstep(1.4+vn(bu*2.)*0.8,0.2,p.y)*0.85);
  c=mix(c,vec3(0.05),smoothstep(0.86,0.9,vn(vec2(a*0.8,p.y*0.9+b.w*10.))));
  return c;
}
vec3 trainAlb(vec3 p,vec3 n,inout vec3 emit){
  float u=p.x-uP0.x, v=p.y;
  vec3 body=vec3(0.66,0.62,0.53);
  if(v>1.02&&v<1.4) body=vec3(0.42,0.22,0.18);
  if(v>2.62) body=vec3(0.5,0.48,0.44);
  if(v<0.75) body=vec3(0.1,0.095,0.09);
  if(n.y>0.6) body=vec3(0.23,0.22,0.21);
  float dirt=smoothstep(1.4,0.5,v)*0.35+0.25*smoothstep(0.55,0.9,vn(vec2(u*3.,v*0.5)))*smoothstep(2.6,1.0,v);
  body*=1.-dirt;
  if(abs(n.z)>0.5){
    float wu=mod(u,2.4);
    bool door=(u>3.8&&u<5.4)||(u>15.0&&u<16.6);
    bool win=!door&&v>1.48&&v<2.38&&wu>0.35&&wu<2.05;
    bool dwin=door&&v>1.55&&v<2.32&&abs(fract((u-3.8)/0.8)-0.5)<0.34;
    if(door&&abs(fract((u-3.8)/0.8+0.5)-0.5)<0.015) body*=0.35;
    if(door&&(abs(u-3.8)<0.02||abs(u-5.4)<0.02||abs(u-15.)<0.02||abs(u-16.6)<0.02)) body*=0.4;
    bool frame=!door&&v>1.44&&v<2.42&&wu>0.31&&wu<2.09&&!win;
    if(frame) body=vec3(0.12);
    if(win||dwin){
      float g=smoothstep(1.48,2.38,v);
      body=mix(vec3(0.05,0.05,0.048),vec3(0.42,0.42,0.4),g*0.55+0.1*vn(vec2(u*2.,v*4.)));
      float seat=step(v,1.75)*step(0.5,fract(u/1.2));
      body*=1.-0.4*seat;
      emit=vec3(0.13,0.11,0.07)*uP0.y*(1.-g*0.5);
    }
  } else if(n.x<-0.5){
    float zz=p.z+3.0;
    if(v>1.5&&v<2.3&&abs(abs(zz)-0.6)<0.4){body=vec3(0.07);emit=vec3(0.1,0.08,0.05)*uP0.y;}
    if(v>0.85&&v<1.0&&abs(abs(zz)-0.95)<0.12){body=vec3(0.3,0.02,0.02);emit=vec3(2.6,0.18,0.08)*uP0.z;}
  }
  return body*(0.88+0.16*vn(vec2(u*0.7,v*3.)));
}
vec3 shade(vec3 p,vec3 n,vec3 rd,float m,float t){
  vec3 alb=vec3(0.5), emit=vec3(0.); float wet=0.;
  if(m<0.5){
    float g=fbm(p.xz*0.6);
    if(p.z>-6.6&&p.z<-1.6){
      float gr=vn(p.xz*38.);
      alb=mix(vec3(0.2,0.19,0.17),vec3(0.44,0.41,0.37),gr)*(0.75+0.4*g);
      alb=mix(alb,vec3(0.2,0.22,0.11),smoothstep(0.5,0.75,fbm3(p.xz*0.7+3.)));
    } else {
      alb=mix(vec3(0.15,0.16,0.08),vec3(0.37,0.34,0.19),g);
      float px=p.x-0.6*sin(p.z*0.17)-0.2;
      float path=smoothstep(1.0,0.35,abs(px))*step(3.2,p.z);
      alb=mix(alb,vec3(0.12,0.1,0.075),path*0.85);
      wet=path*smoothstep(0.55,0.62,fbm3(p.xz*1.3));
    }
    alb*=1.-0.5*anomMark(p.xz);
  } else if(m<1.5){
    float g=fbm(p.xz*1.3+p.y);
    alb=vec3(0.47,0.45,0.41)*(0.7+0.45*g);
    float crack=smoothstep(0.014,0.0,abs(fbm3(p.xz*2.2)-0.5));
    alb=mix(alb,vec3(0.16,0.17,0.11),crack*0.55);
    alb*=0.85+0.25*smoothstep(0.3,0.7,fbm3(p.xz*0.35+9.));
    if(n.y>0.5){
      if(p.z<-1.42&&p.z>-1.6) alb=mix(alb,vec3(0.8,0.78,0.7),0.7*(0.6+0.4*vn(p.xz*9.)));
      if(p.z>-1.15&&p.z<-0.85){
        vec2 dots=fract(p.xz/0.05)-0.5;
        float bump=smoothstep(0.32,0.22,length(dots));
        alb=mix(alb,vec3(0.62,0.52,0.2)*(0.8+0.2*bump),0.75*(0.55+0.45*vn(p.xz*3.)));
      }
      alb=mix(alb,vec3(0.14,0.17,0.08),smoothstep(0.62,0.8,fbm3(p.xz*0.8))*0.8);
    } else {
      alb*=0.75;
      alb=mix(alb,vec3(0.12,0.11,0.09),smoothstep(0.3,0.,p.y)*0.5);
    }
    if(p.z<-6.5) alb=mix(alb,vec3(0.16,0.18,0.09),0.55*smoothstep(0.35,0.6,fbm3(p.xz*0.9)));
  } else if(m<2.5){
    alb=vec3(0.24,0.2,0.17);
    if(n.y>0.7&&p.z>-4.1) alb=vec3(0.55,0.53,0.5);
    wet=0.3;
  } else if(m<3.5){
    alb=vec3(0.2,0.18,0.15)*(0.7+0.5*vn(p.xz*vec2(3.,12.)));
  } else if(m<4.5){
    alb=mix(vec3(0.3,0.16,0.08),vec3(0.12,0.1,0.08),vn(p.xy*8.+p.z));
  } else if(m<5.5){
    vec3 sq=p-vec3(1.2,2.45,-7.25);
    if(n.z>0.5) alb=texture(uTex0,vec2(0.5-sq.x/2.2,sq.y/0.76+0.5)).rgb;
    else alb=vec3(0.22,0.2,0.18);
  } else if(m<6.5){
    alb=vec3(0.24,0.26,0.27)*(0.6+0.6*vn(p.xy*6.));
    alb=mix(alb,vec3(0.32,0.17,0.08),smoothstep(0.4,0.8,vn(p.xy*3.+2.)));
  } else if(m<7.5){
    alb=birchBark(p);
  } else if(m<8.5){
    alb=vec3(0.24,0.235,0.22)*(0.8+0.3*vn(p.xy*0.3));
    vec2 wu=abs(n.z)>0.5?p.xy:p.zy;
    float win=step(0.25,fract(wu.x/3.))*step(fract(wu.x/3.),0.72)*step(0.35,fract(wu.y/4.))*step(fract(wu.y/4.),0.78)*step(wu.y,15.);
    alb=mix(alb,vec3(0.07,0.07,0.065)*(0.6+0.8*h12(floor(wu/vec2(3.,4.)))),win*step(abs(n.y),0.5));
  } else if(m<9.5){
    alb=mix(vec3(0.26,0.14,0.07),vec3(0.14,0.13,0.12),vn(p.xy*5.+p.zx*3.));
  } else {
    alb=trainAlb(p,n,emit);
  }
  float ao=calcAO(p,n);
  vec3 col=lit(alb,n,ao)+emit;
  col*=0.84+0.3*fbm3(p.xz*0.03+vec2(uTime*0.015,uTime*0.004));
  if(wet>0.){
    float fr=0.04+0.96*pow(1.-max(dot(-rd,n),0.),5.);
    col=mix(col,skyCol(reflect(rd,n))*0.75,clamp(fr*wet*1.4,0.,0.85));
  }
  return col;
}
vec3 post(vec3 col,vec3 ro,vec3 rd,float t,float m){
  col=mix(col,uFogCol,fogAmt(ro,rd,t));
  if(uP0.z>0.){
    for(int i=0;i<2;i++){
      vec3 L=vec3(uP0.x-0.05,0.93,-3.0+(float(i)-0.5)*1.9);
      vec3 d=L-ro; float tl=dot(d,rd);
      if(tl>0.&&tl<t+0.3){
        float ang=length(d-rd*tl)/tl;
        float att=exp(-uFogDen*tl*0.55);
        col+=vec3(1.,0.16,0.08)*uP0.z*(exp(-pow(ang/0.0035,2.))*1.4*att+exp(-ang/0.03)*0.35*(0.4+0.6*att));
      }
    }
  }
  return col;
}
`,
};

// ───────────────────────────────────────────────────────────── 02 field of machines
const FIELD = {
  map: /* glsl */`
#define STEPS 120
#define FAR_T 300.
#define STEP_K 0.9
#define FLOOR_Y 0.0
vec4 birch(vec3 p){
  const float C=5.5;
  vec2 c=floor(p.xz/C); vec2 hh=h22(c+3.);
  vec2 ctr=(c+.5+(hh-.5)*.5)*C;
  float clear=step(abs(ctr.x),4.6)*step(-8.,ctr.y)*step(ctr.y,31.);
  clear=max(clear,step(abs(ctr.y-26.6),2.5));
  float grove=vn(c*0.4+1.3);
  float pres=step(0.22+0.62*(1.-grove),hh.x)*(1.-clear);
  vec3 q=p-vec3(ctr.x,0.,ctr.y);
  q.xz-=(hh-.5)*q.y*0.045;
  float r=0.08+0.15*hh.y*hh.y;
  float d=pres>0.5?length(q.xz)-r:1e3;
  vec2 f=fract(p.xz/C); float bd=min(min(f.x,1.-f.x),min(f.y,1.-f.y))*C;
  return vec4(min(d,bd+0.65),q.x,q.z,hh.y);
}
float landmarkBirch(vec3 p, out vec3 q){
  float d=1e3; q=vec3(0.);
  vec3 a=p-vec3(-4.1,0.,6.6); a.xz-=vec2(0.03,-0.01)*a.y;
  float da=length(a.xz)-0.2; if(da<d){d=da;q=a;}
  vec3 b=p-vec3(4.4,0.,17.4); b.xz-=vec2(-0.04,0.02)*b.y;
  float db=length(b.xz)-0.16; if(db<d){d=db;q=b;}
  vec3 c=p-vec3(-4.6,0.,19.8);
  float dc=length(c.xz)-0.14; if(dc<d){d=dc;q=c;}
  return d;
}
float tank(vec3 p){
  vec3 q=p-vec3(0.,0.95,0.);
  float hull=sdRBox(q,vec3(1.45,0.42,3.1),0.1);
  hull=max(hull,dot(q-vec3(0.,0.15,2.75),vec3(0.,0.6,0.8)));
  hull=max(hull,dot(q-vec3(0.,0.2,-2.95),vec3(0.,0.7,-0.714)));
  vec3 tq=vec3(abs(p.x)-1.55,p.y-0.55,p.z);
  float tr=sdRBox(tq,vec3(0.33,0.48,3.15),0.42);
  vec3 r=p-vec3(0.1,1.62,-0.35);
  float tur=max(length(r.xz*vec2(1.,0.82))-1.08,abs(r.y)-0.3);
  tur=smin(tur,length(r-vec3(0.,0.15,0.))-0.78,0.3);
  vec3 b=r-vec3(0.,0.05,0.95);
  b.yz=rot(0.16)*b.yz;
  float bar=sdCap(b,vec3(0.),vec3(0.,0.,3.4),0.085);
  return min(min(hull,tr),min(tur,bar));
}
float truck(vec3 p){
  float cab=sdRBox(p-vec3(0.,1.45,2.1),vec3(1.15,0.85,0.85),0.12);
  cab=max(cab,-sdBox(p-vec3(0.,1.85,2.95),vec3(0.95,0.3,0.25)));
  float hood=sdRBox(p-vec3(0.,1.0,3.35),vec3(0.95,0.4,0.55),0.1);
  float bed=sdBox(p-vec3(0.,0.95,-0.9),vec3(1.15,0.12,2.3));
  bed=min(bed,sdBox(vec3(abs(p.x)-1.12,p.y-1.35,p.z+0.9),vec3(0.04,0.35,2.3)));
  vec3 w=vec3(abs(p.x)-1.05,p.y-0.55,p.z);
  w.z=w.z>0.65?w.z-2.9:w.z+1.6;
  float wheel=sdCyl(vec3(w.y,w.x,w.z),0.52,0.18);
  return min(min(cab,hood),min(bed,wheel));
}
float slab(vec3 p){
  vec3 q=p-vec3(4.7,0.,11.6);
  q.xz=rot(0.55)*q.xz;
  q.xy=rot(0.17)*q.xy;
  float blade=sdBox(q-vec3(0.,0.95,0.),vec3(0.2,1.25,0.035));
  float guard=sdBox(q-vec3(0.,2.22,0.),vec3(0.34,0.06,0.07));
  float grip=sdCyl(q-vec3(0.,2.55,0.),0.05,0.28);
  float pom=length(q-vec3(0.,2.86,0.))-0.08;
  float s=min(min(blade,guard),min(grip,pom));
  s=max(s,-sdBox(q-vec3(0.2,1.3,0.),vec3(0.06,0.04,0.1)));
  s=max(s,-sdBox(q-vec3(-0.21,0.72,0.),vec3(0.05,0.07,0.1)));
  s=max(s,-sdBox(q-vec3(0.21,1.85,0.),vec3(0.035,0.03,0.1)));
  return s;
}
float stakes(vec3 p){
  float d=1e3;
  for(int i=0;i<7;i++){
    float fi=float(i);
    float a=fi*2.39+0.4; float r=1.3+1.4*h11(fi*3.1);
    vec3 q=p-vec3(4.7+cos(a)*r,0.,11.6+sin(a)*r);
    q.xz=rot(fi*1.7)*q.xz;
    q.xy=rot(0.25+0.35*h11(fi*5.3))*q.xy;
    float hg=0.45+0.6*h11(fi*9.7);
    d=min(d,sdBox(q-vec3(0.,hg*0.5,0.),vec3(0.035+0.03*h11(fi),hg*0.5,0.012)));
  }
  return d;
}
vec2 map(vec3 p){
  vec2 res=vec2(1e3,-1.);
  res=opU(res,vec2(birch(p).x,7.));
  vec3 lq; res=opU(res,vec2(landmarkBirch(p,lq),7.));
  // machines that will not go further
  float mb=length(p.xz-vec2(-6.7,9.4))-4.2;
  if(mb<res.x){
    vec3 q=p-vec3(-6.7,-0.28,9.4); q.xz=rot(-0.64)*q.xz; q.xy=rot(0.05)*q.xy;
    res=opU(res,vec2(tank(q),12.));
  } else res=opU(res,vec2(mb+0.2,-1.));
  float mb2=length(p.xz-vec2(7.6,18.2))-4.5;
  if(mb2<res.x){
    vec3 q=p-vec3(7.6,-0.22,18.2); q.xz=rot(-1.0)*q.xz; q.yz=rot(-0.06)*q.yz;
    res=opU(res,vec2(truck(q),12.));
  } else res=opU(res,vec2(mb2+0.2,-1.));
  float mb3=length(p.xz-vec2(13.5,5.))-4.2;
  if(mb3<res.x){
    vec3 q=p-vec3(13.5,-0.35,5.); q.xz=rot(2.4)*q.xz;
    res=opU(res,vec2(tank(q),12.));
  } else res=opU(res,vec2(mb3+0.2,-1.));
  // a fallen crane boom
  {
    vec3 a=vec3(8.4,0.25,0.4), b=vec3(16.5,6.2,12.5);
    vec3 ba=b-a; float L=length(ba); vec3 dir=ba/L;
    vec3 pa=p-a; float h=clamp(dot(pa,dir),0.,L);
    res=opU(res,vec2(length(pa-dir*h)-0.33,13.));
  }
  // the slab of iron and the brands around it
  float bs=length(p.xz-vec2(4.7,11.6))-3.9;
  if(bs<res.x){
    res=opU(res,vec2(slab(p),14.));
    res=opU(res,vec2(stakes(p),15.));
  } else res=opU(res,vec2(bs+0.2,-1.));
  // telegraph poles
  float pz=mod(p.z+4.,25.)-12.5;
  float pole=min(sdCyl(vec3(p.x+13.,p.y-5.,pz),0.12,5.),sdBox(vec3(p.x+13.,p.y-9.3,pz),vec3(1.0,0.06,0.07)));
  res=opU(res,vec2(pole,16.));
  // the wall and the mouth of the tunnel
  float wb=sdBox(p-vec3(0.,3.,26.6),vec3(60.,3.6,0.9));
  if(wb<res.x+0.5){
    float top=5.6-2.3*fbm3(vec2(p.x*0.15,1.3));
    float w=sdBox(p-vec3(0.,3.,26.6),vec3(60.,3.,0.6));
    w=max(w,p.y-top);
    float rl=length(p.xy-vec2(0.,2.1));
    w=max(w,2.35-rl);
    float collar=max(abs(rl-2.55)-0.2,abs(p.z-25.85)-0.25);
    w=min(w,collar);
    res=opU(res,vec2(w*0.9,17.));
  } else res=opU(res,vec2(wb,-1.));
  {
    float rl=length(p.xy-vec2(0.,2.1));
    float tube=max(max(2.35-rl,rl-2.8),abs(p.z-44.7)-18.2);
    tube=min(tube,max(rl-2.8,abs(p.z-62.9)-0.3));
    res=opU(res,vec2(tube,18.));
  }
  float far=82.-p.z;
  if(far<res.x){
    float fac=sdBox(p-vec3(-30.,9.,120.),vec3(24.,9.,10.));
    fac=min(fac,max(sdBox(p-vec3(-30.,19.1,120.),vec3(24.,1.1,10.)),(p.y-18.-2.2*fract((p.x+60.)/4.))*0.8));
    fac=min(fac,sdCyl(p-vec3(-12.,26.,112.),1.8,26.));
    fac=min(fac,sdCyl(p-vec3(-19.,22.,114.),1.5,22.));
    fac=min(fac,sdBox(p-vec3(22.,12.,135.),vec3(12.,12.,9.)));
    fac=min(fac,sdBox(p-vec3(30.,110.,280.),vec3(10.,110.,10.)));
    res=opU(res,vec2(fac,19.));
  }
  return res;
}
`,
  shade: /* glsl */`
vec3 skyCol(vec3 rd){
  float y=clamp(rd.y,0.,1.);
  vec3 c=mix(uFogCol,vec3(0.72,0.75,0.71),pow(y,0.55));
  vec2 cu=rd.xz/(rd.y+0.2);
  c*=0.92+0.12*fbm3(cu*0.7+vec2(uTime*0.006,0.));
  return c;
}
vec3 sky(vec3 ro,vec3 rd){return skyCol(rd);}
vec3 lit(vec3 alb,vec3 n,float ao){
  vec3 kd=normalize(vec3(0.4,0.8,-0.35));
  float hemi=0.5+0.5*n.y;
  vec3 amb=mix(vec3(0.2,0.22,0.17),vec3(0.72,0.76,0.72),hemi);
  float dif=max(dot(n,kd),0.);
  return alb*(amb*(0.3+0.7*ao)+vec3(0.95,0.95,0.85)*dif*0.28*ao);
}
vec3 bark(vec2 lq, float y, float seed){
  float a=atan(lq.y,lq.x);
  vec2 bu=vec2(a*2.,y);
  float lent=smoothstep(0.62,0.75,vn(vec2(bu.x*1.5,bu.y*9.)))*smoothstep(0.3,0.6,vn(bu*vec2(1.,0.7)));
  vec3 c=vec3(0.78,0.78,0.73)*(0.85+0.15*vn(bu*vec2(3.,20.)));
  c=mix(c,vec3(0.07,0.065,0.06),lent);
  c=mix(c,vec3(0.12,0.11,0.09),smoothstep(1.5+vn(bu*2.)*0.9,0.2,y)*0.85);
  c=mix(c,vec3(0.05),smoothstep(0.86,0.9,vn(vec2(a*0.8,y*0.9+seed*10.))));
  return c;
}
vec3 rust(vec3 p,vec3 n){
  float r=fbm(p.xz*1.7+p.y*2.3);
  float r2=vn(p.xy*7.+p.z*3.);
  vec3 c=mix(vec3(0.42,0.21,0.09),vec3(0.15,0.1,0.07),r);
  c=mix(c,vec3(0.2,0.22,0.14),smoothstep(0.55,0.7,r2)*0.7);
  c=mix(c,vec3(0.43,0.22,0.09),smoothstep(0.7,0.9,vn(p.yz*11.))*0.5);
  float moss=smoothstep(0.5,0.9,n.y)*smoothstep(0.45,0.7,fbm3(p.xz*2.));
  c=mix(c,vec3(0.13,0.16,0.06),moss);
  c*=1.-0.35*smoothstep(0.5,0.9,vn(vec2(p.x*9.+p.z*9.,p.y*0.8)))*(1.-abs(n.y));
  return c;
}
float pathX(float z){return 0.8*sin(z*0.21)+0.5*sin(z*0.07+1.);}
vec3 shade(vec3 p,vec3 n,vec3 rd,float m,float t){
  vec3 alb=vec3(0.5); float wet=0.; vec3 emit=vec3(0.);
  if(m<0.5){
    float g=fbm(p.xz*0.5);
    alb=mix(vec3(0.12,0.14,0.06),vec3(0.33,0.31,0.17),g);
    alb=mix(alb,vec3(0.2,0.22,0.1),smoothstep(0.4,0.7,vn(p.xz*3.1))*0.5);
    float path=smoothstep(1.1,0.4,abs(p.x-pathX(p.z)))*smoothstep(-2.,0.,p.z)*smoothstep(27.,24.,p.z);
    alb=mix(alb,vec3(0.11,0.09,0.065)*(0.8+0.4*vn(p.xz*6.)),path*0.9);
    float pud=smoothstep(0.56,0.6,fbm3(p.xz*0.9+4.))*path;
    wet=path*0.35+pud;
    alb*=1.-0.6*pud;
    float scorch=smoothstep(3.2,1.0,length(p.xz-vec2(4.7,11.6)));
    alb=mix(alb,vec3(0.05,0.045,0.04),scorch*0.75*smoothstep(0.3,0.6,fbm3(p.xz*2.)+0.3));
    alb*=1.-0.55*anomMark(p.xz);
    float inTube=step(26.,p.z)*smoothstep(2.6,2.2,abs(p.x));
    alb*=1.-inTube*(1.-exp(-(p.z-26.)*0.35))*0.97;
    n=normalize(n+vec3(rainRings(p.xz,uRain*pud),0.,0.)*0.25);
  } else if(m<7.5){
    vec4 b=birch(p); vec3 lq; float dl=landmarkBirch(p,lq);
    alb= dl<b.x ? bark(lq.xz,p.y,0.3) : bark(b.yz,p.y,b.w);
  } else if(m<12.5){
    alb=rust(p,n);
  } else if(m<13.5){
    alb=rust(p*1.3,n)*(0.6+0.4*step(0.5,fract(dot(p,vec3(0.7,0.4,0.6))*2.2)));
  } else if(m<14.5){
    vec3 q=p-vec3(4.7,0.,11.6);
    float r=fbm(vec2(q.x*3.+q.z*3.,q.y*2.5));
    alb=mix(vec3(0.1,0.085,0.075),vec3(0.36,0.17,0.07),smoothstep(0.35,0.75,r));
    alb=mix(alb,vec3(0.48,0.25,0.1),smoothstep(0.78,0.9,vn(q.xy*14.+q.z))*0.6);
    alb=mix(alb,vec3(0.16,0.12,0.09),smoothstep(2.3,2.5,p.y)*0.7);
    wet=0.25;
  } else if(m<15.5){
    alb=mix(vec3(0.08,0.07,0.06),vec3(0.3,0.15,0.07),vn(p.xy*9.+p.z*4.));
  } else if(m<16.5){
    alb=vec3(0.18,0.15,0.12)*(0.7+0.5*vn(p.xy*4.));
  } else if(m<17.5){
    float g=fbm(p.xy*0.9+p.z);
    alb=vec3(0.44,0.43,0.4)*(0.65+0.45*g);
    alb*=1.-0.4*smoothstep(0.5,0.9,vn(vec2(p.x*3.,p.y*0.3)));
    alb=mix(alb,vec3(0.12,0.15,0.07),smoothstep(1.6,0.,p.y)*0.6+smoothstep(0.6,0.85,fbm3(p.xy*0.7))*0.5);
  } else if(m<18.5){
    alb=vec3(0.05,0.05,0.045)*exp(-(p.z-26.)*0.08);
  } else {
    alb=vec3(0.22,0.23,0.21)*(0.8+0.3*vn(p.xy*0.3));
    vec2 wu=abs(n.z)>0.5?p.xy:p.zy;
    float win=step(0.25,fract(wu.x/3.))*step(fract(wu.x/3.),0.72)*step(0.35,fract(wu.y/4.))*step(fract(wu.y/4.),0.78)*step(wu.y,16.);
    alb=mix(alb,vec3(0.06),win*step(abs(n.y),0.5));
  }
  float ao=calcAO(p,n);
  vec3 col=lit(alb,n,ao)+emit;
  col*=0.84+0.3*fbm3(p.xz*0.03+vec2(uTime*0.015,uTime*0.004));
  if(m>17.5&&m<18.5) col*=exp(-(p.z-26.)*0.12);
  if(wet>0.){
    float fr=0.04+0.96*pow(1.-max(dot(-rd,n),0.),5.);
    col=mix(col,skyCol(reflect(rd,n))*0.8,clamp(fr*wet*1.6,0.,0.9));
  }
  return col;
}
vec3 post(vec3 col,vec3 ro,vec3 rd,float t,float m){
  float fa=fogAmt(ro,rd,t);
  if(m>17.5&&m<18.5) fa*=0.15;
  return mix(col,uFogCol,fa);
}
`,
};

// ───────────────────────────────────────────────────────────── 03 the long throat
const TUNNEL = {
  map: /* glsl */`
#define STEPS 100
#define FAR_T 90.
#define STEP_K 0.9
#define FLOOR_Y 0.25
float holeZ(float z){return z<10.75?6.0:(z<21.25?15.5:27.0);}
vec2 map(vec3 p){
  vec2 c=p.xy-vec2(0.,2.0);
  float len=length(c);
  float wall=2.25-len;
  float rz=mod(p.z,3.2)-1.6;
  wall=min(wall,max(2.12-len,abs(rz)-0.14));
  float hole=length(vec2(p.x,p.z-holeZ(p.z)))-0.55;
  wall=max(wall,-max(hole,3.2-p.y));
  wall=max(wall,max(p.z-uP0.x,-6.-p.z));
  vec2 res=vec2(wall,1.);
  vec3 cq=p-vec3(0.92,0.25,9.5); cq.xz=rot(0.25)*cq.xz;
  float cart=sdBox(cq-vec3(0.,0.45,0.),vec3(0.42,0.32,0.7));
  cart=max(cart,-sdBox(cq-vec3(0.,0.62,0.),vec3(0.37,0.3,0.65)));
  cart=min(cart,sdCyl(vec3(cq.y-0.15,abs(cq.x)-0.3,abs(cq.z)-0.45),0.13,0.04));
  res=opU(res,vec2(cart,2.));
  res=opU(res,vec2(sdCap(p,vec3(-1.05,0.38,13.0),vec3(-0.7,0.4,17.5),0.13),2.));
  res=opU(res,vec2(sdCap(p,vec3(1.1,0.3,21.0),vec3(0.6,0.28,22.2),0.09),2.));
  float cond=length(vec2(p.x+1.92,p.y-2.75))-0.07;
  cond=min(cond,length(vec2(p.x+1.78,p.y-3.05))-0.045);
  res=opU(res,vec2(cond,3.));
  float sw=0.18*sin(uTime*0.45+1.);
  res=opU(res,vec2(sdCap(p,vec3(1.3,3.65,3.0),vec3(0.75+sw*0.2,2.75,6.5),0.022),3.));
  res=opU(res,vec2(sdCap(p,vec3(-1.2,3.7,18.6),vec3(-0.5,3.0+sw*0.1,22.0),0.02),3.));
  // stones
  vec2 sc=floor(p.xz/vec2(1.1,1.3)); vec2 sh=h22(sc+9.);
  vec3 sq=vec3(mod(p.x,1.1)-0.55-(sh.x-0.5)*0.5,p.y-0.25,mod(p.z,1.3)-0.65-(sh.y-0.5)*0.6);
  float st=sh.x>0.72?length(sq*vec3(1.,1.6,1.))/1.6-0.07-0.06*sh.y:1e3;
  res=opU(res,vec2(max(st,abs(p.x)-1.3),4.));
  return res;
}
`,
  shade: /* glsl */`
vec3 sky(vec3 ro,vec3 rd){
  return vec3(0.82,0.85,0.8)*(1.15+0.2*rd.y);
}
vec3 tunLight(vec3 p,vec3 n){
  vec3 L=vec3(0.018,0.02,0.018);
  for(int i=0;i<3;i++){
    float hz=i==0?6.0:(i==1?15.5:27.0);
    vec3 d=vec3(0.,4.3,hz)-p; float dist=length(d); vec3 l=d/dist;
    float cone=smoothstep(0.62,0.95,l.y);
    L+=vec3(0.92,0.95,0.86)*2.2*max(dot(n,l),0.)*cone/(1.+dist*dist*0.2);
    float disc=smoothstep(0.9,0.4,length(p.xz-vec2(0.,hz)))*step(p.y,0.3);
    L+=vec3(1.,1.,0.92)*disc*0.9;
  }
  float de=uP0.x-p.z;
  L+=vec3(0.82,0.88,0.8)*1.5*(0.3+0.7*max(n.z,0.))*exp(-max(de,0.)*0.085)*uP0.y;
  float db=p.z+6.;
  L+=vec3(0.8,0.82,0.78)*0.45*(0.3+0.7*max(-n.z,0.))*exp(-max(db,0.)*0.13);
  return L;
}
vec3 shade(vec3 p,vec3 n,vec3 rd,float m,float t){
  vec3 alb; float wet=0.;
  if(m<0.5){
    float g=fbm(p.xz*1.4);
    alb=vec3(0.22,0.21,0.18)*(0.65+0.5*g);
    float ch=smoothstep(0.48,0.4,abs(p.x));
    wet=0.25+ch*0.75;
    alb=mix(alb,vec3(0.04,0.05,0.04),ch);
    alb*=1.-0.5*anomMark(p.xz);
    float w1=sin(p.z*5.+uTime*2.6+sin(p.x*9.)*1.2), w2=sin(p.z*8.3-p.x*4.+uTime*3.4);
    n=normalize(n+vec3(sin(p.x*12.+uTime)*0.02,0.,w1*0.03+w2*0.02)*ch);
  } else if(m<1.5){
    float g=fbm(vec2(atan(p.x,p.y-2.)*3.,p.z*0.8));
    alb=vec3(0.32,0.31,0.28)*(0.6+0.5*g);
    alb=mix(alb,vec3(0.12,0.14,0.08),smoothstep(0.55,0.8,fbm3(p.xz*0.9+p.y))*0.6);
    alb*=1.-0.45*smoothstep(0.55,0.9,vn(vec2(atan(p.x,p.y-2.)*14.,p.y*0.6)));
    wet=0.15;
  } else if(m<2.5){
    alb=mix(vec3(0.24,0.12,0.05),vec3(0.08,0.07,0.06),vn(p.xy*6.+p.z*2.));
  } else if(m<3.5){
    alb=vec3(0.08,0.075,0.07);
  } else {
    alb=vec3(0.25,0.24,0.21)*(0.7+0.5*vn(p.xz*9.));
  }
  float ao=calcAO(p,n);
  vec3 col=alb*tunLight(p,n)*(0.4+0.6*ao);
  if(wet>0.){
    vec3 r=reflect(rd,n);
    float fr=0.03+0.97*pow(1.-max(dot(-rd,n),0.),5.);
    vec3 env=vec3(0.85,0.9,0.82)*pow(max(r.z,0.),18.)*exp(-max(uP0.x-p.z,0.)*0.02)*0.8*uP0.y;
    for(int i=0;i<3;i++){
      float hz=i==0?6.0:(i==1?15.5:27.0);
      vec3 d=normalize(vec3(0.,4.3,hz)-p);
      env+=vec3(0.9,0.92,0.85)*pow(max(dot(r,d),0.),60.)*1.2;
    }
    col+=env*fr*wet*2.;
  }
  return col;
}
vec3 post(vec3 col,vec3 ro,vec3 rd,float t,float m){
  col=mix(col,uFogCol,1.-exp(-t*uFogDen));
  for(int i=0;i<3;i++){
    float hz=i==0?6.0:(i==1?15.5:27.0);
    vec2 o=vec2(ro.x,ro.z-hz), d=vec2(rd.x,rd.z);
    float a=dot(d,d), b=dot(o,d), c=dot(o,o)-0.36;
    float disc=b*b-a*c;
    if(disc>0.&&a>1e-5){
      float s=sqrt(disc);
      float t0=max((-b-s)/a,0.), t1=min((-b+s)/a,t);
      if(abs(rd.y)>1e-4){
        float ya=(0.25-ro.y)/rd.y, yb=(4.4-ro.y)/rd.y;
        t0=max(t0,min(ya,yb)); t1=min(t1,max(ya,yb));
      }
      if(t1>t0){
        vec3 pm=ro+rd*(0.5*(t0+t1));
        float dust=0.55+0.45*vn(pm.xz*4.+vec2(0.,uTime*0.25))*vn(pm.xy*3.-uTime*0.1);
        col+=vec3(0.78,0.8,0.72)*(t1-t0)*0.2*dust;
      }
    }
  }
  return col;
}
`,
};

// ───────────────────────────────────────────────────────────── 04 the flooded corridor
const CORRIDOR = {
  map: /* glsl */`
#define STEPS 90
#define FAR_T 60.
#define STEP_K 0.95
#define FLOOR_Y 0.14
vec2 map(vec3 p){
  float left=abs(p.x+1.85)-0.15;
  float wz=mod(p.z+1.,8.)-4.;
  left=max(left,-sdBox(vec3(p.x+1.85,p.y-2.65,wz),vec3(0.3,0.45,0.7)));
  float right=1.7-p.x;
  float dz=p.z<15.?p.z-7.:p.z-23.;
  right=max(right,-sdBox(vec3(p.x-1.85,p.y-1.1,dz),vec3(0.4,1.1,0.5)));
  right=max(right,-sdBox(vec3(p.x-3.4,p.y-1.4,dz),vec3(1.5,1.4,1.8)));
  float ceil=max(3.4-p.y,-1.75-p.x);
  float back=max(p.z+3.,-2.-p.x);
  float endw=max(abs(p.z-33.15)-0.15,-2.-p.x);
  endw=max(endw,-sdBox(vec3(p.x,p.y-1.1,p.z-33.15),vec3(0.6,1.1,0.4)));
  float shell=min(min(left,right),min(ceil,min(back,endw)));
  vec2 res=vec2(shell,1.);
  float pipes=min(length(p.xy-vec2(-1.45,3.15))-0.08,length(p.xy-vec2(-1.22,3.24))-0.05);
  pipes=min(pipes,length(p.xy-vec2(1.42,3.12))-0.1);
  res=opU(res,vec2(pipes,2.));
  float lz=mod(p.z-1.,8.)-4.;
  float lamp=sdBox(vec3(p.x,p.y-2.78,lz),vec3(0.22,0.035,0.12));
  lamp=min(lamp,sdBox(vec3(p.x,p.y-3.1,lz),vec3(0.008,0.3,0.008)));
  res=opU(res,vec2(lamp,3.));
  return res;
}
`,
  shade: /* glsl */`
const vec3 SUN=vec3(0.5299,-0.8267,0.1060);
vec3 sky(vec3 ro,vec3 rd){return vec3(0.9,0.93,0.86)*(1.3+0.3*rd.y);}
float sunlit(vec3 p){
  float s=(-1.7-p.x)/(-SUN.x);
  if(s<0.) return 0.;
  vec3 q=p-SUN*s;
  float zc=mod(q.z+1.,8.)-4.;
  float lit=smoothstep(0.7,0.6,abs(zc))*smoothstep(2.2,2.3,q.y)*smoothstep(3.1,3.0,q.y);
  return lit*step(-2.,q.z)*step(q.z,31.);
}
vec3 tiles(vec2 uv,float side,vec3 p){
  vec2 g=uv/0.15; vec2 id=floor(g); vec2 f=fract(g);
  float grout=smoothstep(0.,0.07,f.x)*smoothstep(1.,0.93,f.x)*smoothstep(0.,0.07,f.y)*smoothstep(1.,0.93,f.y);
  float rnd=h12(id+side*31.);
  vec3 c=p.y<1.2?vec3(0.22,0.33,0.29):vec3(0.8,0.8,0.75);
  if(abs(p.y-1.22)<0.05) c=vec3(0.1,0.17,0.15);
  c*=0.9+0.14*rnd;
  float streak=smoothstep(0.45,0.95,vn(vec2(uv.x*7.,p.y*0.5)));
  c*=1.-0.45*streak*(0.4+0.6*(1.-p.y/3.4));
  c*=0.75+0.35*fbm3(uv*0.8+side);
  c=mix(c,vec3(0.11,0.15,0.07),smoothstep(0.75,0.18,p.y)*0.85);
  if(rnd>0.93) c=vec3(0.3,0.29,0.26)*(0.55+0.5*vn(uv*20.));
  return mix(c*0.3,c,grout);
}
vec3 surfAlb(vec3 p,vec3 n,float m,out float gloss){
  gloss=0.;
  if(m<1.5){
    if(abs(n.x)>0.5){gloss=1.;return tiles(vec2(p.z,p.y),sign(n.x),p);}
    if(abs(n.z)>0.5){gloss=1.;return tiles(vec2(p.x,p.y),3.+sign(n.z),p);}
    float g=fbm(p.xz*1.5);
    vec3 c=vec3(0.36,0.35,0.32)*(0.6+0.5*g);
    return mix(c,vec3(0.18,0.16,0.12),smoothstep(0.55,0.75,fbm3(p.xz*1.1))*0.7);
  }
  if(m<2.5) return mix(vec3(0.28,0.14,0.06),vec3(0.1,0.09,0.08),vn(p.zy*vec2(2.,9.)));
  return vec3(0.12,0.12,0.11);
}
vec3 corrLight(vec3 p,vec3 n){
  float sl=sunlit(p+n*0.02);
  vec3 L=vec3(0.13,0.15,0.135)*(0.6+0.4*n.y)+vec3(0.07,0.08,0.07);
  L+=vec3(1.05,1.0,0.88)*2.4*sl*max(dot(n,-SUN),0.);
  L+=vec3(0.35,0.4,0.33)*exp(-max(32.-p.z,0.)*0.18);
  L+=vec3(0.16,0.18,0.15)*smoothstep(1.5,0.,abs(p.y-2.6))*step(p.x,-1.5)*0.6;
  return L;
}
vec3 surf(vec3 p,vec3 n,vec3 rd,float m){
  float gloss; vec3 alb=surfAlb(p,n,m,gloss);
  if(m>0.5&&m<1.5&&p.x>1.75) alb*=0.25;
  vec3 col=alb*corrLight(p,n);
  if(gloss>0.){
    vec3 r=reflect(rd,n);
    col+=vec3(0.9,0.95,0.85)*pow(max(dot(r,-SUN),0.),30.)*0.35*sunlit(p+n*0.05);
    col+=sky(p,r)*0.04*pow(1.-max(dot(-rd,n),0.),3.);
  }
  return col;
}
vec3 waterN(vec3 p){
  vec2 g=0.035*vec2(vn(p.xz*3.+uTime*0.2)-0.5,vn(p.xz*3.-uTime*0.17+5.)-0.5);
  for(int i=0;i<8;i++){
    vec4 r=uRip[i]; float age=uTime-r.z;
    if(age<0.||age>5.) continue;
    vec2 d=p.xz-r.xy; float dist=length(d)+1e-4;
    float front=age*0.5;
    float w=sin((dist-front)*30.)*exp(-pow((dist-front)*4.,2.))*exp(-age*0.9)*r.w;
    g+=d/dist*w*0.4;
  }
  return normalize(vec3(-g.x,1.,-g.y));
}
vec3 traceRefl(vec3 ro,vec3 rd){
  float t=0.02;
  for(int i=0;i<44;i++){float h=map(ro+rd*t).x;if(h<0.002*t)break;t+=h;if(t>40.)break;}
  if(t>40.) return sky(ro,rd);
  vec3 p=ro+rd*t; vec3 n=calcNormal(p,t);
  vec3 c=surf(p,n,rd,map(p).y);
  return mix(c,uFogCol,1.-exp(-t*uFogDen));
}
vec3 floorUnder(vec3 p){
  vec2 g=p.xz/0.1; vec2 f=fract(g);
  float grout=smoothstep(0.,0.1,f.x)*smoothstep(1.,0.9,f.x)*smoothstep(0.,0.1,f.y)*smoothstep(1.,0.9,f.y);
  vec3 c=vec3(0.3,0.33,0.3)*(0.8+0.3*h12(floor(g)));
  c=mix(c*0.4,c,grout);
  c=mix(c,vec3(0.13,0.15,0.08),smoothstep(0.45,0.75,fbm3(p.xz*1.3))*0.8);
  vec2 duv=vec2((p.x+0.9)/1.8,(p.z-12.)/3.6);
  if(duv.x>0.&&duv.x<1.&&duv.y>0.&&duv.y<1.){
    vec4 d=texture(uTex0,duv);
    c=mix(c,d.rgb,d.a);
  }
  return c;
}
vec3 shade(vec3 p,vec3 n,vec3 rd,float m,float t){
  if(m<0.5){
    vec3 wn=waterN(p);
    float cosi=max(dot(-rd,wn),0.);
    float fr=0.02+0.98*pow(1.-cosi,5.);
    vec3 rr=reflect(rd,wn);
    vec3 refl=traceRefl(p+wn*0.01,rr);
    vec3 tr=refract(rd,wn,0.75);
    vec3 fp=p+tr*(0.14/max(-tr.y,0.05));
    vec3 und=floorUnder(fp);
    float sl=sunlit(fp);
    float caus=pow(abs(sin(vn(fp.xz*7.+uTime*0.6)*6.)*sin(vn(fp.xz*6.-uTime*0.5+3.)*6.)),2.);
    vec3 ul=vec3(0.24,0.27,0.24)+vec3(1.1,1.05,0.9)*sl*(1.2+2.2*caus);
    ul+=vec3(0.3,0.36,0.3)*exp(-max(32.-fp.z,0.)*0.18);
    vec3 below=und*ul*vec3(0.75,0.9,0.78);
    return mix(below,refl,fr)+vec3(1.,1.,0.9)*pow(max(dot(rr,-SUN),0.),200.)*sunlit(p)*3.;
  }
  vec3 col=surf(p,n,rd,m);
  col*=0.45+0.55*calcAO(p,n);
  return col;
}
vec3 post(vec3 col,vec3 ro,vec3 rd,float t,float m){
  col=mix(col,uFogCol,1.-exp(-t*uFogDen));
  float tm=min(t,28.); float acc=0.;
  float jit=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(0.06711056,0.00583715))));
  for(int i=0;i<16;i++){
    float s=(float(i)+jit)/16.*tm;
    vec3 q=ro+rd*s;
    acc+=sunlit(q)*(0.6+0.4*vn(q.yz*2.5+vec2(uTime*0.12,0.)));
  }
  col+=vec3(0.95,0.95,0.82)*acc*tm/16.*0.06;
  return col;
}
`,
};

// ───────────────────────────────────────────────────────────── 05 hall of sand
const DUNES = {
  map: /* glsl */`
#define STEPS 130
#define FAR_T 95.
#define STEP_K 0.85
float sandH(vec2 q){
  float s=0.5+0.5*sin(0.38*q.x+0.21*q.y+1.1*sin(0.09*q.y+0.2*q.x));
  float e=max(abs(q.x)-7.,0.);
  return -0.3+1.05*s*s+0.12*sin(0.9*q.x-0.5*q.y)+0.02*e*e;
}
vec2 map(vec3 p){
  float g=min((p.y-sandH(p.xz))*0.62,p.y);
  vec2 res=vec2(g,1.);
  float wz=mod(p.z+2.,8.)-4.;
  float lw=abs(p.x+12.25)-0.25;
  lw=max(lw,-sdBox(vec3(p.x+12.25,p.y-6.8,wz),vec3(0.5,3.8,1.5)));
  float rw=12.-p.x;
  rw=max(rw,-sdBox(vec3(p.x-12.2,p.y-10.8,wz),vec3(0.5,0.9,1.2)));
  vec2 rc=floor(vec2(p.x/6.,p.z/8.));
  float roof=abs(p.y-13.2)-0.2;
  if(h12(rc+4.)>0.55) roof=max(roof,-sdBox(vec3(mod(p.x,6.)-3.,p.y-13.2,mod(p.z,8.)-4.),vec3(2.2,0.5,3.0)));
  float back=p.z+4.;
  float endw=46.-p.z;
  endw=max(endw,-sdBox(vec3(p.x-10.2,p.y-1.3,p.z-46.),vec3(0.8,1.3,0.6)));
  res=opU(res,vec2(min(min(lw,rw),min(roof,min(back,endw))),2.));
  float col=sdBox(vec3(abs(p.x)-7.5,p.y-6.5,wz),vec3(0.3,6.5,0.3));
  col=max(col,p.z-39.);
  float beam=sdBox(vec3(p.x,p.y-12.4,wz),vec3(12.,0.45,0.25));
  res=opU(res,vec2(min(col,beam),3.));
  float stage=sdBox(p-vec3(0.,0.65,43.),vec3(8.,0.65,3.));
  float pros=max(sdBox(p-vec3(0.,6.5,40.2),vec3(12.,6.5,0.2)),-sdBox(p-vec3(0.,4.6,40.2),vec3(7.,3.3,1.)));
  res=opU(res,vec2(min(stage,pros),4.));
  vec3 cq=vec3(abs(p.x)-6.2,p.y-4.6,p.z-40.7);
  float curtain=sdBox(cq,vec3(0.8,3.3,0.1+0.06*sin(p.x*8.)));
  res=opU(res,vec2(curtain*0.8,5.));
  float cb=sdBox(p-vec3(0.,0.6,28.),vec3(5.,1.0,6.2));
  if(cb<0.4){
    vec2 cc=floor(vec2(p.x/1.1,p.z/1.3));
    float hh=h12(cc);
    vec3 q=vec3(mod(p.x,1.1)-0.55,p.y-0.25-hh*0.3,mod(p.z,1.3)-0.65);
    q.xy=rot((hh-0.5)*0.6)*q.xy;
    float seat=sdBox(q-vec3(0.,0.42,0.),vec3(0.2,0.02,0.19));
    float bk=sdBox(q-vec3(0.,0.68,-0.18),vec3(0.2,0.15,0.015));
    float legs=sdBox(vec3(abs(q.x)-0.17,q.y-0.2,abs(q.z)-0.16),vec3(0.015,0.21,0.015));
    float ch=hh>0.35?min(min(seat,bk),legs):1e3;
    res=opU(res,vec2(max(ch,cb),6.));
  } else res=opU(res,vec2(cb,-1.));
  float bb=sdBox(p-vec3(11.7,4.0,20.),vec3(0.03,0.55,0.9));
  vec3 hq=p-vec3(11.25,3.05,20.);
  float hoop=length(vec2(length(hq.xz)-0.23,hq.y))-0.014;
  bb=min(bb,hoop);
  bb=min(bb,sdBox(p-vec3(11.85,3.6,20.),vec3(0.15,0.04,0.06)));
  res=opU(res,vec2(bb,7.));
  float clock=sdCyl(vec3(p.x,p.z-39.95,p.y-9.2),0.55,0.04);
  res=opU(res,vec2(clock,8.));
  vec3 pq=p-vec3(-4.6,0.,15.5); pq.xz=rot(0.4)*pq.xz; pq.xy=rot(0.12)*pq.xy;
  float piano=sdRBox(pq-vec3(0.,0.5,0.),vec3(0.75,0.65,0.3),0.03);
  piano=max(piano,-sdBox(pq-vec3(0.,0.85,0.32),vec3(0.65,0.08,0.1)));
  res=opU(res,vec2(piano,9.));
  return res;
}
`,
  shade: /* glsl */`
const vec3 SUN=vec3(0.7826,-0.4565,0.3261);
vec3 sky(vec3 ro,vec3 rd){return vec3(0.86,0.85,0.78)*(1.2+0.3*rd.y);}
float sunlit(vec3 p){
  float s=(-12.-p.x)/(-SUN.x);
  if(s<0.) return 0.;
  vec3 q=p-SUN*s;
  float zc=mod(q.z+2.,8.)-4.;
  return smoothstep(1.5,1.35,abs(zc))*smoothstep(3.0,3.2,q.y)*smoothstep(10.6,10.4,q.y)*step(-4.,q.z)*step(q.z,40.);
}
vec3 hallLight(vec3 p,vec3 n){
  vec3 L=vec3(0.3,0.29,0.26)*(0.55+0.45*n.y);
  L+=vec3(0.07,0.065,0.06);
  L+=vec3(1.2,1.0,0.78)*2.3*sunlit(p+n*0.03)*max(dot(n,-SUN),0.);
  L+=vec3(0.25,0.24,0.2)*smoothstep(2.,0.,abs(p.x+11.))*0.6;
  return L;
}
vec3 shade(vec3 p,vec3 n,vec3 rd,float m,float t){
  vec3 alb; float gl=0.;
  if(m<1.5){
    float h=sandH(p.xz);
    float floorOnly=smoothstep(0.03,-0.04,h-p.y+0.0)*step(p.y,0.02);
    vec2 rp=vec2(dot(p.xz,vec2(0.88,0.47)),dot(p.xz,vec2(-0.47,0.88)));
    float rip=sin(rp.x*13.+vn(p.xz*2.)*4.);
    float rip2=sin(rp.x*31.+vn(p.xz*5.)*3.);
    vec3 sn=normalize(n+vec3(0.88,0.,0.47)*(rip*0.11+rip2*0.04));
    vec3 sand=vec3(0.66,0.6,0.48)*(0.85+0.2*vn(p.xz*3.))*(0.92+0.08*rip);
    vec3 wood=vec3(0.3,0.2,0.12)*(0.7+0.35*vn(vec2(floor(p.x/0.1)*3.1,p.z*0.4)));
    wood*=0.9+0.1*step(0.04,fract(p.x/0.1));
    float line=smoothstep(0.03,0.0,abs(abs(p.x)-6.))+smoothstep(0.03,0.0,abs(p.z-4.))+smoothstep(0.03,0.,abs(length(p.xz-vec2(0.,12.))-1.8));
    wood=mix(wood,vec3(0.7,0.66,0.55),clamp(line,0.,1.)*0.8);
    float film=smoothstep(-0.05,0.02,h);
    alb=mix(wood,sand,max(film,1.-floorOnly));
    n=mix(n,sn,max(film,1.-floorOnly));
    gl=floorOnly*(1.-smoothstep(-0.2,0.,h))*0.25;
    alb*=1.-0.45*anomMark(p.xz);
  } else if(m<2.5){
    float g=fbm(p.zy*0.4+p.x);
    alb=p.y<2.2?vec3(0.24,0.3,0.25):vec3(0.62,0.6,0.54);
    alb*=0.6+0.5*g;
    alb=mix(alb,vec3(0.4,0.38,0.33),smoothstep(0.6,0.75,vn(p.zy*1.3))*0.6);
    alb*=1.-0.4*smoothstep(0.5,0.9,vn(vec2(p.z*4.,p.y*0.4)));
  } else if(m<3.5){
    alb=vec3(0.5,0.48,0.44)*(0.65+0.45*fbm3(p.xy*2.+p.z));
  } else if(m<4.5){
    alb=p.y<1.32?vec3(0.24,0.16,0.1):vec3(0.55,0.52,0.47)*(0.7+0.3*fbm3(p.xy));
  } else if(m<5.5){
    alb=vec3(0.36,0.12,0.1)*(0.65+0.45*sin(p.x*30.+sin(p.y*2.)*2.)*0.5+0.3*vn(p.xy*3.));
  } else if(m<6.5){
    alb=p.y-sandH(p.xz)>0.38?vec3(0.32,0.2,0.12):vec3(0.2,0.2,0.2);
  } else if(m<7.5){
    alb=p.x>11.5?vec3(0.75,0.74,0.7):vec3(0.5,0.22,0.08);
  } else if(m<8.5){
    vec2 c=vec2(p.x,p.y-9.2);
    alb=vec3(0.82,0.8,0.74);
    float a1=atan(c.x,c.y), r=length(c);
    float hand=smoothstep(0.03,0.0,abs(sin(a1-2.83)*r))*step(r,0.38)*step(0.,cos(a1-2.83));
    hand=max(hand,smoothstep(0.03,0.0,abs(sin(a1-5.47)*r))*step(r,0.27)*step(0.,cos(a1-5.47)));
    alb=mix(alb,vec3(0.05),hand);
    alb=mix(alb,vec3(0.1),smoothstep(0.5,0.53,r));
  } else {
    alb=vec3(0.06,0.05,0.045)*(0.8+0.3*vn(p.xy*4.));
    gl=0.5;
  }
  float ao=calcAO(p,n);
  vec3 col=alb*hallLight(p,n)*(0.35+0.65*ao);
  if(gl>0.){
    vec3 r=reflect(rd,n);
    col+=vec3(1.,0.95,0.8)*pow(max(dot(r,-SUN),0.),20.)*gl*sunlit(p+n*0.05)*1.5;
  }
  return col;
}
vec3 post(vec3 col,vec3 ro,vec3 rd,float t,float m){
  col=mix(col,uFogCol,1.-exp(-t*uFogDen));
  float tm=min(t,60.); float acc=0.;
  float jit=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(0.06711056,0.00583715))));
  for(int i=0;i<16;i++){
    float s=(float(i)+jit)/16.*tm;
    vec3 q=ro+rd*s;
    acc+=sunlit(q)*(0.55+0.45*vn(q.yz*0.9+vec2(uTime*0.08,uTime*0.02)));
  }
  col+=vec3(1.0,0.9,0.72)*acc*tm/16.*0.02;
  return col;
}
`,
};

// ───────────────────────────────────────────────────────────── 06 before the Room
const MONOLITH = {
  map: /* glsl */`
#define STEPS 110
#define FAR_T 420.
#define STEP_K 0.9
#define FLOOR_Y 0.0
float bonfire(vec3 p){
  vec3 q=p-vec3(0.,0.,41.4);
  float ash=(length(q/vec3(0.58,0.17,0.58))-1.)*0.17;
  float st=1e3;
  for(int i=0;i<11;i++){
    float fi=float(i);
    float a=fi*0.571+0.35*h11(fi*3.7);
    float rr=0.6+0.12*h11(fi*5.1);
    vec3 c=vec3(cos(a)*rr,0.02+0.03*h11(fi*2.3),sin(a)*rr);
    vec3 sq=q-c; sq.xz=rot(a+h11(fi)*1.5)*sq.xz; sq.xy=rot(h11(fi*7.)*0.6-0.3)*sq.xy;
    vec3 rad=vec3(0.12+0.06*h11(fi*1.3),0.07+0.04*h11(fi*4.1),0.09+0.03*h11(fi*6.6));
    st=min(st,(length(sq/rad)-1.)*0.07);
  }
  vec3 r=q-vec3(0.03,0.,0.);
  r.xy=rot(0.13)*r.xy;
  r.xz=rot(r.y*5.5)*r.xz;
  float blade=sdBox(r-vec3(0.,0.5,0.),vec3(0.045,0.52,0.008))*0.7;
  float hilt=sdCyl(r-vec3(0.,1.1,0.),0.022,0.1);
  return min(min(ash,st),min(blade,hilt));
}
vec2 map(vec3 p){
  vec2 res=vec2(1e3,-1.);
  float mono=sdBox(p-vec3(0.,95.,55.),vec3(7.,95.,9.));
  float door=sdBox(p-vec3(0.,2.3,48.5),vec3(1.5,2.3,2.6));
  float room=sdBox(p-vec3(0.,3.4,57.),vec3(6.,3.4,6.));
  mono=max(mono,-min(door,room));
  float slit=sdBox(p-vec3(0.,7.,57.),vec3(0.35,1.,5.));
  mono=max(mono,-slit);
  res=opU(res,vec2(mono,1.));
  res=opU(res,vec2(sdBox(p-vec3(0.,0.08,45.6),vec3(2.2,0.08,0.4)),1.));
  float o=sdBox(p-vec3(-36.,120.,108.),vec3(5.,120.,6.));
  o=min(o,sdBox(p-vec3(46.,160.,150.),vec3(7.,160.,6.)));
  o=min(o,sdBox(p-vec3(-96.,140.,205.),vec3(9.,140.,9.)));
  o=min(o,sdBox(p-vec3(16.,200.,265.),vec3(6.,200.,6.)));
  o=min(o,sdBox(p-vec3(-24.,70.,345.),vec3(26.,70.,5.)));
  o=min(o,sdBox(p-vec3(110.,90.,240.),vec3(10.,90.,14.)));
  res=opU(res,vec2(o,2.));
  vec3 lq=p-vec3(4.6,0.,45.85);
  float lad=sdBox(vec3(abs(lq.x)-0.25,lq.y-40.,lq.z),vec3(0.025,38.,0.025));
  float rung=sdBox(vec3(lq.x,mod(lq.y,0.32)-0.16,lq.z),vec3(0.25,0.012,0.012));
  rung=max(rung,abs(lq.y-40.)-38.);
  res=opU(res,vec2(min(lad,rung),3.));
  float bb=length(p-vec3(0.,0.4,41.4))-1.3;
  if(bb<0.3) res=opU(res,vec2(bonfire(p),4.));
  else res=opU(res,vec2(bb,-1.));
  float rs=(p.y-(0.22*sin(p.x*0.9+1.)*sin(p.z*0.7)+0.12))*0.7;
  rs=max(rs,sdBox(p-vec3(0.,1.,57.),vec3(5.9,1.5,5.9)));
  res=opU(res,vec2(rs,6.));
  vec2 rb=vec2(mod(p.x+2.,4.)-2.,mod(p.z+2.,4.)-2.);
  vec2 rid=floor((p.xz+2.)/4.);
  float rh=h12(rid);
  float reb=rh>0.82&&p.z<44.?sdCap(vec3(rb.x,p.y,rb.y),vec3((rh-0.9)*8.,0.,0.4),vec3((rh-0.9)*8.+0.12,0.3+rh*0.35,0.32),0.014):1e3;
  res=opU(res,vec2(reb,3.));
  return res;
}
`,
  shade: /* glsl */`
vec3 skyCol(vec3 rd){
  float y=clamp(rd.y,0.,1.);
  vec3 c=mix(uFogCol,vec3(0.7,0.73,0.7),pow(y,0.6));
  c*=0.93+0.1*fbm3(rd.xz/(rd.y+0.25)*0.6+vec2(uTime*0.005,0.));
  return c;
}
vec3 sky(vec3 ro,vec3 rd){return skyCol(rd);}
vec3 fireLight(vec3 p,vec3 n){
  if(uFire.w<=0.) return vec3(0.);
  vec3 d=uFire.xyz-p; float dist=length(d);
  return vec3(1.,0.52,0.2)*uFire.w*2.6*max(dot(n,d/dist),0.)/(1.+dist*dist*0.7);
}
vec3 lit(vec3 alb,vec3 n,float ao,vec3 p){
  vec3 kd=normalize(vec3(-0.3,0.85,-0.4));
  float hemi=0.5+0.5*n.y;
  vec3 amb=mix(vec3(0.18,0.19,0.17),vec3(0.66,0.7,0.68),hemi);
  float inRoom=smoothstep(46.05,47.5,p.z)*step(abs(p.x),6.2)*step(p.y,7.);
  amb*=mix(1.,0.08,inRoom);
  float dif=max(dot(n,kd),0.)*(1.-inRoom);
  vec3 c=alb*(amb*(0.3+0.7*ao)+vec3(0.9,0.92,0.86)*dif*0.22*ao);
  if(inRoom>0.){
    float beam=smoothstep(0.9,0.2,abs(p.x))*smoothstep(52.,54.,p.z)*smoothstep(62.,60.,p.z);
    c+=alb*vec3(0.55,0.6,0.55)*beam*0.5;
  }
  return c+alb*fireLight(p,n)*(0.4+0.6*ao);
}
vec3 concrete(vec3 p,vec3 n){
  vec2 uv=abs(n.z)>0.5?p.xy:p.zy;
  float g=fbm(uv*0.35);
  vec3 c=vec3(0.36,0.36,0.345)*(0.7+0.4*g)*(0.8+0.3*fbm3(uv*0.04+3.));
  c*=1.-0.18*smoothstep(0.012,0.,abs(fract(uv.y/0.3)-0.5)-0.47);
  c*=1.-0.35*smoothstep(0.03,0.,abs(fract(uv.x/3.)-0.5)-0.49);
  c*=1.-0.4*smoothstep(0.45,0.95,vn(vec2(uv.x*2.5,uv.y*0.04)))*smoothstep(0.,30.,uv.y+10.);
  c=mix(c,vec3(0.1,0.13,0.06),smoothstep(2.5,0.,p.y)*smoothstep(0.4,0.7,fbm3(uv*1.3))*0.8);
  c*=mix(0.7,1.,smoothstep(0.,3.,p.y));
  return c;
}
vec3 traceRefl(vec3 ro,vec3 rd){
  float t=0.05;
  for(int i=0;i<40;i++){float h=map(ro+rd*t).x;if(h<0.002*t)break;t+=h;if(t>260.)break;}
  vec3 c;
  if(t>260.) c=skyCol(rd);
  else{vec3 p=ro+rd*t; vec3 n=calcNormal(p,t); c=concrete(p,n)*0.55+fireLight(p,n)*0.2;}
  return mix(c,uFogCol,fogAmt(ro,rd,t));
}
vec3 shade(vec3 p,vec3 n,vec3 rd,float m,float t){
  vec3 alb; float wet=0.;
  if(m<0.5){
    vec2 cell=floor(p.xz/4.); vec2 f=fract(p.xz/4.);
    float gap=smoothstep(0.006,0.002,min(min(f.x,1.-f.x),min(f.y,1.-f.y)));
    float g=fbm(p.xz*0.7);
    alb=vec3(0.38,0.38,0.36)*(0.7+0.35*h12(cell))*(0.75+0.4*g);
    alb=mix(alb,vec3(0.13,0.14,0.09),gap*0.8);
    alb=mix(alb,vec3(0.13,0.15,0.08),smoothstep(0.6,0.8,fbm3(p.xz*0.5))*0.6);
    float pud=smoothstep(0.52,0.56,fbm3(p.xz*0.35+7.))*(1.-gap);
    wet=0.35+0.65*pud;
    alb*=1.-0.55*pud;
    float ashd=smoothstep(1.6,0.6,length(p.xz-vec2(0.,41.4)));
    alb=mix(alb,vec3(0.1,0.09,0.085),ashd*0.6);
    float rr=rainRings(p.xz,uRain*pud);
    n=normalize(n+vec3(rr*0.4,0.,rr*0.25));
  } else if(m<1.5){
    alb=concrete(p,n);
    if(p.z>46.05&&abs(p.x)<6.2&&p.y<7.) alb*=0.6;
  } else if(m<2.5){
    alb=concrete(p,n)*0.85;
  } else if(m<3.5){
    alb=mix(vec3(0.25,0.12,0.05),vec3(0.1,0.08,0.06),vn(p.xy*8.));
  } else if(m<4.5){
    vec3 q=p-vec3(0.,0.,41.4);
    float r=length(q.xz);
    alb=r<0.5&&p.y<0.18?mix(vec3(0.24,0.23,0.21),vec3(0.05,0.045,0.04),smoothstep(0.45,0.7,vn(q.xz*16.))+smoothstep(0.3,0.05,r)*0.7)*(0.75+0.35*vn(q.xz*40.)):vec3(0.15,0.14,0.13)*(0.6+0.5*vn(q.xz*8.+q.y*5.));
    if(r<0.12&&p.y>0.15) alb=vec3(0.09,0.07,0.06);
    float ember=smoothstep(0.35,0.,p.y)*smoothstep(0.5,0.,r)*uFire.w;
    alb+=vec3(1.4,0.45,0.1)*ember*(0.5+0.5*vn(q.xz*14.+uTime*2.));
  } else {
    alb=vec3(0.48,0.44,0.36)*(0.8+0.3*vn(p.xz*2.));
    wet=smoothstep(0.08,0.,p.y-0.05)*0.8;
  }
  float ao=calcAO(p,n);
  vec3 col=lit(alb,n,ao,p);
  if(wet>0.){
    float fr=0.03+0.97*pow(1.-max(dot(-rd,n),0.),5.);
    vec3 r=reflect(rd,n);
    vec3 refl= m<0.5&&wet>0.6 ? traceRefl(p+n*0.02,r) : skyCol(r)*0.7;
    col=mix(col,refl,clamp(fr*wet*1.5,0.,0.92));
  }
  return col;
}
vec3 post(vec3 col,vec3 ro,vec3 rd,float t,float m){
  float fa=fogAmt(ro,rd,t);
  vec3 ph=ro+rd*t;
  if(ph.z>46.2&&abs(ph.x)<6.2&&ph.y<7.) fa*=0.35;
  col=mix(col,uFogCol,fa);
  if(uFire.w>0.){
    vec3 d=uFire.xyz-ro; float tl=dot(d,rd);
    if(tl>0.){
      float dist=length(d-rd*tl);
      float vis=tl<t+0.5?1.:0.25;
      col+=vec3(1.,0.5,0.18)*uFire.w*vis*(exp(-dist*dist*1.6)*0.5+exp(-dist*0.9)*0.08);
    }
  }
  return col;
}
`,
};

// ───────────────────────────────────────────────────────────── 07 coda: a table, three glasses
const CODA = {
  map: /* glsl */`
#define STEPS 90
#define FAR_T 60.
#define STEP_K 0.95
#define FLOOR_Y 0.0
vec2 map(vec3 p){
  float room=min(min(p.x+2.6,2.6-p.x),min(2.8-p.y,p.z+3.));
  float back=abs(p.z-2.35)-0.15;
  back=max(back,-sdBox(p-vec3(0.15,1.65,2.35),vec3(1.0,0.68,0.4)));
  float roomOk=step(p.z,2.55);
  vec2 res=vec2(roomOk>0.5?min(room,back):back,1.);
  float frame=min(sdBox(p-vec3(0.15,1.65,2.3),vec3(1.0,0.022,0.035)),sdBox(p-vec3(0.15,1.65,2.3),vec3(0.022,0.68,0.035)));
  frame=min(frame,sdBox(p-vec3(0.15,0.99,2.22),vec3(1.05,0.03,0.12)));
  res=opU(res,vec2(frame,4.));
  float top=sdRBox(p-vec3(0.,0.755,0.3),vec3(0.88,0.022,0.46),0.008);
  float legs=sdBox(vec3(abs(p.x)-0.8,p.y-0.37,abs(p.z-0.3)-0.38),vec3(0.03,0.37,0.03));
  res=opU(res,vec2(min(top,legs),2.));
  vec3 bq=p-vec3(-0.5,0.79,0.52); bq.xz=rot(0.3)*bq.xz;
  res=opU(res,vec2(sdRBox(bq,vec3(0.11,0.012,0.15),0.004),5.));
  vec3 cq=p-vec3(0.95,0.,-0.35);
  float chair=sdBox(cq-vec3(0.,0.45,0.),vec3(0.21,0.02,0.2));
  chair=min(chair,sdBox(cq-vec3(0.2,0.72,0.),vec3(0.015,0.27,0.2)));
  chair=min(chair,sdBox(vec3(abs(cq.x)-0.18,cq.y-0.22,abs(cq.z)-0.17),vec3(0.015,0.22,0.015)));
  res=opU(res,vec2(chair,3.));
  if(p.z>2.5){
    vec2 c=floor(p.xz/5.); vec2 hh=h22(c+11.);
    vec2 ctr=(c+.5+(hh-.5)*.4)*5.;
    float tr=hh.x>0.35&&ctr.y>6.?length(p.xz-ctr)-0.14:1e3;
    vec2 f=fract(p.xz/5.); float bd=min(min(f.x,1.-f.x),min(f.y,1.-f.y))*5.;
    res=opU(res,vec2(min(tr,bd+0.8),6.));
  }
  return res;
}
`,
  shade: /* glsl */`
vec3 sky(vec3 ro,vec3 rd){return mix(uFogCol,vec3(0.86,0.87,0.84),clamp(rd.y*2.,0.,1.))*1.15;}
vec3 env(vec3 r){
  vec3 wd=normalize(vec3(0.15,1.65,2.3)-vec3(0.,0.85,0.3));
  return vec3(0.9,0.91,0.88)*smoothstep(0.82,0.97,dot(r,wd))*1.3+vec3(0.03);
}
vec3 roomLight(vec3 p,vec3 n){
  vec3 wc=vec3(0.15,1.65,2.3);
  vec3 d=wc-p; float dist=length(d); vec3 l=d/dist;
  float inside=step(p.z,2.25);
  vec3 L=vec3(0.07,0.07,0.065)+vec3(0.85,0.87,0.84)*2.3*max(dot(n,l)*0.8+0.2,0.)/(1.+dist*dist*0.3)*inside;
  L+=vec3(0.13)*(0.5+0.5*n.y)*inside;
  return mix(vec3(0.7),L,inside);
}
vec3 shade(vec3 p,vec3 n,vec3 rd,float m,float t){
  vec3 alb;
  if(m<0.5){
    alb=vec3(0.22,0.16,0.11)*(0.7+0.35*vn(vec2(floor(p.x/0.14)*7.,p.z*0.5)));
    alb*=0.85+0.15*step(0.03,fract(p.x/0.14));
    if(p.z>2.5) alb=vec3(0.25,0.27,0.2)*(0.7+0.4*fbm3(p.xz));
  } else if(m<1.5){
    float g=fbm(p.xy*1.2+p.z);
    alb=vec3(0.36,0.34,0.27)*(0.7+0.35*g);
    float stripe=0.5+0.5*sin(p.x*40.+p.z*40.);
    alb*=0.92+0.08*stripe;
    float peel=smoothstep(0.55,0.62,fbm3(p.xy*1.5+p.z*0.7));
    alb=mix(alb,vec3(0.24,0.23,0.2),peel);
    alb*=1.-0.35*smoothstep(0.4,0.,p.y);
  } else if(m<2.5){
    alb=vec3(0.26,0.17,0.1)*(0.75+0.3*vn(vec2(p.x*2.,p.z*30.)));
    if(p.y>0.77){
      for(int i=0;i<3;i++){
        vec2 g=i==0?vec2(uP0.x,0.32):(i==1?vec2(-0.32,0.45):vec2(-0.12,0.15));
        float r=i==0?0.034:(i==1?0.05:0.03);
        vec2 q=p.xz-g;
        float sh=smoothstep(r+0.03,r-0.005,length(q-vec2(0.,-0.045)));
        alb*=1.-0.45*sh;
        alb+=vec3(0.5,0.48,0.42)*smoothstep(r*0.5,0.,length(q-vec2(0.,-0.05)))*0.6;
      }
    }
  } else if(m<3.5){
    alb=vec3(0.2,0.14,0.09);
  } else if(m<4.5){
    alb=vec3(0.3,0.28,0.24)*(0.7+0.3*vn(p.xy*30.));
  } else if(m<5.5){
    alb=vec3(0.3,0.12,0.09);
    if(p.y>0.8) alb=vec3(0.55,0.52,0.45);
  } else {
    alb=vec3(0.55,0.55,0.5);
  }
  float ao=calcAO(p,n);
  vec3 col=alb*roomLight(p,n)*(0.35+0.65*ao);
  if(m>1.5&&m<2.5&&n.y>0.5){
    vec3 r=reflect(rd,normalize(n+vec3(vn(p.xz*40.)-0.5,0.,vn(p.zx*37.)-0.5)*0.03));
    float fr=0.05+0.95*pow(1.-max(dot(-rd,n),0.),5.);
    col+=env(r)*fr*0.9*ao;
  }
  return col;
}
vec3 glass(vec3 col,vec3 ro,vec3 rd,float tmax,vec3 c,float r,float h,float fill){
  vec2 o=ro.xz-c.xz, d=rd.xz;
  float a=dot(d,d), b=dot(o,d), cc=dot(o,o)-r*r;
  float disc=b*b-a*cc;
  if(disc<0.) return col;
  float s=sqrt(disc);
  float ts[2]; ts[0]=(-b+s)/a; ts[1]=(-b-s)/a;
  for(int k=0;k<2;k++){
    float tk=ts[k];
    if(tk<0.||tk>tmax) continue;
    vec3 p=ro+rd*tk; float y=p.y-c.y;
    if(y<0.||y>h) continue;
    vec3 n=normalize(vec3(p.x-c.x,0.,p.z-c.z));
    if(k==0) n=-n;
    float ci=abs(dot(n,rd));
    float fr=0.04+0.96*pow(1.-ci,5.);
    if(fill>0.&&y<fill) col*=vec3(0.8,0.86,0.8);
    col=col*(0.93-0.3*pow(1.-ci,2.))+env(reflect(rd,n))*fr+vec3(0.85,0.87,0.82)*pow(1.-ci,7.)*0.5;
    col+=vec3(1.)*smoothstep(0.003,0.,h-y)*0.6;
    col+=vec3(0.9)*smoothstep(0.012,0.006,y)*0.25;
    if(fill>0.) col+=vec3(0.7,0.75,0.7)*smoothstep(0.004,0.,abs(y-fill))*0.5*(1.+uP0.z*sin(length(p.xz-c.xz)*300.-uTime*30.));
  }
  return col;
}
vec3 post(vec3 col,vec3 ro,vec3 rd,float t,float m){
  col=mix(col,uFogCol,1.-exp(-max(t-3.,0.)*uFogDen));
  vec2 tr=uP0.y*vec2(sin(uTime*71.),sin(uTime*53.+1.))*0.0012;
  col=glass(col,ro,rd,t,vec3(-0.32,0.777,0.45),0.05,0.15,0.06);
  col=glass(col,ro,rd,t,vec3(-0.12+tr.y*0.3,0.777,0.15),0.03,0.13,0.);
  col=glass(col,ro,rd,t,vec3(uP0.x+tr.x,0.777,0.32+tr.y),0.034,0.105,0.);
  return col;
}
`,
};

export const SCENE_GLSL = { platform: PLATFORM, field: FIELD, tunnel: TUNNEL, corridor: CORRIDOR, dunes: DUNES, monolith: MONOLITH, coda: CODA };

export const FULL_VS = `#version 300 es
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}`;

export function sceneFS(id) {
  const s = SCENE_GLSL[id];
  return PRELUDE + s.map + POSTMAP + s.shade + MAIN;
}

// ───────────────────────────────────────────────────────────── raster layer
const RVS = `#version 300 es
precision highp float;
${CAM}
${HFOG}
vec4 project(vec3 p){
  vec3 v=p-uCam; float z=dot(v,uF);
  float A=(uFar+uNear)/(uFar-uNear), B=-2.*uFar*uNear/(uFar-uNear);
  return vec4(dot(v,uR)*uFocal/uAspect, dot(v,uU)*uFocal, A*z+B, z);
}
`;
const RFS = `#version 300 es
precision highp float;
${CAM}
${HFOG}
`;

export const GRASS_VS = RVS + /* glsl */`
layout(location=0) in vec2 aV;
layout(location=1) in vec4 aI;
layout(location=2) in float aS;
uniform float uTime, uWind;
uniform vec4 uAnom[6];
uniform vec4 uPush;
out float vT; out float vS; out vec3 vW;
void main(){
  float h=aI.w; vec3 base=aI.xyz;
  for(int i=0;i<6;i++){vec4 a=uAnom[i];if(a.w>0.){float d=length(base.xz-a.xy)/a.z;h*=mix(1.,0.1,a.w*smoothstep(1.05,0.75,d));}}
  float ang=aS*6.2831;
  vec2 side=vec2(cos(ang),sin(ang));
  float t=aV.y;
  float w=(0.008+0.012*fract(aS*13.7))*(1.-t*0.9);
  float g=sin(uTime*1.5+base.x*0.33+base.z*0.21+aS*3.)*0.35+sin(uTime*0.5+base.x*0.07-base.z*0.11)*0.65;
  float bend=(0.12+uWind*(0.55+0.45*g))*t*t;
  vec2 wd=vec2(0.9162,0.4008);
  vec2 droop=vec2(cos(aS*41.),sin(aS*41.))*0.3;
  vec3 p=base+vec3(side.x*aV.x*w,t*h*(1.-0.22*bend),side.y*aV.x*w);
  p.xz+=(wd*bend+droop*t*t)*h;
  vec2 dp=p.xz-uPush.xy; float dl=length(dp);
  p.xz+=dp/max(dl,1e-3)*uPush.z*t*smoothstep(1.,0.,dl);
  vT=t; vS=aS; vW=p;
  gl_Position=project(p);
}`;
export const GRASS_FS = RFS + /* glsl */`
in float vT; in float vS; in vec3 vW;
uniform vec3 uGrassA, uGrassB;
uniform float uLight;
out vec4 o;
void main(){
  vec3 c=mix(uGrassA,uGrassB,vT*vT*(0.6+0.8*fract(vS*7.3)));
  c*=(0.7+0.5*fract(vS*91.7))*(0.55+0.6*vT)*uLight;
  vec3 rd=vW-uCam; float t=length(rd);
  c=mix(c,uFogCol,fogAmt(uCam,rd/t,t));
  o=vec4(c,1.);
}`;

// generic lit triangles: gauze strips, nuts, birds
export const TRI_VS = RVS + /* glsl */`
layout(location=0) in vec3 aP;
layout(location=1) in vec4 aC;
out vec4 vC; out vec3 vW;
void main(){vC=aC;vW=aP;gl_Position=project(aP);}`;
export const TRI_FS = RFS + /* glsl */`
in vec4 vC; in vec3 vW;
out vec4 o;
void main(){
  vec3 rd=vW-uCam; float t=length(rd);
  vec3 c=mix(vC.rgb,uFogCol,fogAmt(uCam,rd/t,t));
  o=vec4(c,vC.a);
}`;

// point sprites: dust, embers, glints, phantom, sand
export const PT_VS = RVS + /* glsl */`
layout(location=0) in vec3 aP;
layout(location=1) in float aSize;
layout(location=2) in vec4 aC;
layout(location=3) in float aK;
uniform float uViewH;
out vec4 vC; out float vK; out float vFog;
void main(){
  vec4 cp=project(aP);
  gl_Position=cp;
  gl_PointSize=clamp(aSize*uFocal*uViewH*0.5/max(cp.w,0.05),1.,220.);
  vC=aC; vK=aK;
  vec3 rd=aP-uCam; float t=length(rd);
  vFog=fogAmt(uCam,rd/max(t,1e-3),t);
}`;
export const PT_FS = RFS + /* glsl */`
in vec4 vC; in float vK; in float vFog;
out vec4 o;
void main(){
  vec2 q=gl_PointCoord*2.-1.; float r=length(q);
  float a;
  if(vK<0.5) a=smoothstep(1.,0.,r);
  else if(vK<1.5){
    float star=max(smoothstep(0.12,0.,abs(q.x))*smoothstep(1.,0.,abs(q.y)),smoothstep(0.12,0.,abs(q.y))*smoothstep(1.,0.,abs(q.x)));
    a=max(star,smoothstep(0.35,0.,r))+smoothstep(0.08,0.,abs(r-0.62))*0.5;
  } else a=smoothstep(0.35,0.,r)+smoothstep(1.,0.,r)*0.35;
  a*=vC.a*(1.-vFog*0.85);
  if(a<0.003) discard;
  o=vec4(vC.rgb*a,a);
}`;

// ground decals: soapstone scribble, bloodstain
export const DEC_VS = RVS + /* glsl */`
layout(location=0) in vec3 aP;
layout(location=1) in vec2 aUV;
layout(location=2) in vec3 aK;
out vec2 vUV; out vec3 vK; out vec3 vW;
void main(){vUV=aUV;vK=aK;vW=aP;gl_Position=project(aP);}`;
export const DEC_FS = RFS + /* glsl */`
in vec2 vUV; in vec3 vK; in vec3 vW;
uniform sampler2D uScrib;
uniform float uTime;
out vec4 o;
float h12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(h12(i),h12(i+vec2(1.,0.)),u.x),mix(h12(i+vec2(0.,1.)),h12(i+vec2(1.,1.)),u.x),u.y);}
void main(){
  vec3 rd=vW-uCam; float t=length(rd);
  float fog=fogAmt(uCam,rd/t,t);
  vec3 c; float a;
  if(vK.x<0.5){
    vec2 uv=vec2(vUV.x,(vUV.y+floor(vK.y*4.))/4.);
    float s=texture(uScrib,uv).r;
    float edge=smoothstep(0.,0.12,vUV.x)*smoothstep(1.,0.88,vUV.x)*smoothstep(0.,0.15,vUV.y)*smoothstep(1.,0.85,vUV.y);
    float fl=0.82+0.18*sin(uTime*2.3+vK.y*20.)*sin(uTime*1.1+vK.y*7.);
    c=vec3(1.,0.46,0.12)*(s*1.6+0.12*edge)*fl;
    a=1.;
  } else {
    vec2 q=vUV*2.-1.;
    float r=length(q*vec2(1.,1.25))+0.25*(vn(vUV*6.+vK.y*9.)-0.5);
    float pool=smoothstep(0.75,0.45,r);
    float glow=smoothstep(1.,0.2,r);
    float pulse=0.7+0.3*sin(uTime*1.7+vK.y*5.);
    c=vec3(0.85,0.04,0.02)*(pool*0.9+glow*0.35)*pulse;
    a=1.;
  }
  c*=vK.z*(1.-fog);
  o=vec4(c,a);
}`;

// bonfire flames (camera-facing quads)
export const FIRE_VS = RVS + /* glsl */`
layout(location=0) in vec3 aP;
layout(location=1) in vec2 aUV;
layout(location=2) in float aSeed;
out vec2 vUV; out float vSeed;
void main(){vUV=aUV;vSeed=aSeed;gl_Position=project(aP);}`;
export const FIRE_FS = RFS + /* glsl */`
in vec2 vUV; in float vSeed;
uniform float uTime, uFireA;
out vec4 o;
float h12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(h12(i),h12(i+vec2(1.,0.)),u.x),mix(h12(i+vec2(0.,1.)),h12(i+vec2(1.,1.)),u.x),u.y);}
void main(){
  vec2 uv=vUV;
  float t=uTime*1.6+vSeed*10.;
  float n=vn(vec2(uv.x*5.+vSeed*3.,uv.y*4.-t*2.2))*0.6+vn(vec2(uv.x*11.,uv.y*9.-t*3.7))*0.4;
  float x=(uv.x-0.5)*2.;
  float body=1.-abs(x)/(0.95*(1.-uv.y)*(1.-uv.y)+0.05);
  float f=clamp(body*1.4-uv.y*0.9+n*0.85-0.35,0.,1.);
  f*=smoothstep(0.,0.1,uv.y);
  vec3 c=mix(vec3(0.9,0.18,0.03),vec3(1.,0.62,0.2),smoothstep(0.2,0.6,f));
  c=mix(c,vec3(1.,0.93,0.72),smoothstep(0.65,0.95,f));
  float a=f*uFireA;
  o=vec4(c*a*1.5,a);
}`;

// rain streaks (instanced lines)
export const RAIN_VS = RVS + /* glsl */`
layout(location=0) in float aEnd;
layout(location=1) in vec3 aSeed;
uniform float uTime;
uniform vec3 uBoxC, uBoxS;
uniform vec3 uVel;
uniform float uFollow;
out float vA; out vec3 vW;
void main(){
  vec3 c=uBoxC+uCam*uFollow;
  vec3 p;
  p.x=c.x+(fract(aSeed.x)-0.5)*uBoxS.x;
  p.z=c.z+(fract(aSeed.z)-0.5)*uBoxS.z;
  float fall=fract(aSeed.y-uTime*(-uVel.y)/uBoxS.y*(0.85+0.3*fract(aSeed.x*31.)));
  p.y=uBoxC.y-uBoxS.y*0.5+fall*uBoxS.y;
  p.xz+=uVel.xz*fall*0.4;
  p+=aEnd*uVel*0.028;
  vA=0.35+0.65*fract(aSeed.z*17.);
  vW=p;
  gl_Position=project(p);
}`;
export const RAIN_FS = RFS + /* glsl */`
in float vA; in vec3 vW;
uniform float uRainA;
uniform vec3 uRainC;
out vec4 o;
void main(){
  vec3 rd=vW-uCam; float t=length(rd);
  float a=vA*uRainA*(1.-fogAmt(uCam,rd/t,t))*smoothstep(0.3,1.2,t);
  o=vec4(uRainC*a,a);
}`;

// film post
export const POST_FS = /* glsl */`#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform vec2 uRes, uSRes;
uniform float uTime, uSepia, uFade, uWhite, uPull, uGrain, uExpo, uVig, uBloom, uSat;
uniform vec4 uDist[6];
uniform vec2 uPullC;
uniform vec3 uTint;
out vec4 o;
float h12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(h12(i),h12(i+vec2(1.,0.)),u.x),mix(h12(i+vec2(0.,1.)),h12(i+vec2(1.,1.)),u.x),u.y);}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  float asp=uRes.x/uRes.y;
  vec2 suv=uv+vec2(0.,sin(uTime*11.3)*0.0003+sin(uTime*2.1)*0.00025);
  vec2 off=vec2(0.);
  for(int i=0;i<6;i++){
    vec4 d=uDist[i]; if(d.w<=0.) continue;
    vec2 q=(suv-d.xy)*vec2(asp,1.);
    float r=length(q)/d.z;
    if(r<1.){
      float w=(1.-r)*(1.-r)*d.w;
      vec2 nz=vec2(vn(suv*vec2(70.,26.)+vec2(0.,-uTime*2.6)),vn(suv*vec2(60.,30.)+vec2(9.,-uTime*2.2)))-0.5;
      off+=nz*w*0.028;
    }
  }
  if(uPull>0.){
    vec2 q=(suv-uPullC)*vec2(asp,1.);
    float r=length(q);
    float a=uPull*uPull*4.*exp(-r*2.);
    float c=cos(a), s=sin(a);
    q=mat2(c,-s,s,c)*q*(1.-0.3*uPull*exp(-r*1.5));
    suv=uPullC+q/vec2(asp,1.);
  }
  suv+=off;
  float ca=0.0009+uPull*0.014+length(off)*0.5;
  vec2 dir=uv-0.5;
  vec3 col;
  col.r=texture(uScene,suv+dir*ca).r;
  col.g=texture(uScene,suv).g;
  col.b=texture(uScene,suv-dir*ca).b;
  vec3 bl=vec3(0.);
  vec2 px=1./uSRes;
  for(int i=0;i<12;i++){
    float a=float(i)*2.39996; float rr=2.+float(i)*1.1;
    vec3 s=texture(uScene,suv+vec2(cos(a),sin(a))*px*rr*1.7).rgb;
    bl+=max(s-0.6,0.);
  }
  col+=bl/12.*uBloom*vec3(1.,0.9,0.78);
  col*=uExpo;
  float l=dot(col,vec3(0.299,0.587,0.114));
  vec3 zone=mix(vec3(l),col,uSat)*uTint;
  zone=zone/(1.+zone*0.22)*1.1;
  vec3 sep=vec3(l)*vec3(1.12,0.96,0.72);
  sep=smoothstep(vec3(-0.04),vec3(1.08),sep);
  col=mix(zone,sep,uSepia);
  col=col*0.95+0.03*vec3(1.,0.97,0.9)*(1.-col);
  vec2 vq=(uv-0.5)*vec2(asp,1.);
  col*=1.-uVig*smoothstep(0.3,1.05,length(vq));
  col*=1.+0.012*sin(uTime*23.)*sin(uTime*5.7);
  col=mix(col,vec3(0.87,0.88,0.85),uWhite);
  col*=1.-uFade;
  float g=h12(gl_FragCoord.xy+fract(uTime*7.13)*vec2(193.,71.))-0.5;
  col+=g*uGrain*(0.55+0.45*(1.-l));
  col+=(h12(gl_FragCoord.xy*1.37+11.)-0.5)/255.;
  o=vec4(clamp(col,0.,1.),1.);
}`;
