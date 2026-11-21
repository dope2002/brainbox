// A contact keeps one owner until release, including at scroll boundaries.
function createGestureInput(platform, handlers) {
  let contact=null;
  function cancel() {
    if(contact)handlers.cancel();
    contact=null;
  }
  platform.onStart(touches=>{
    if(contact || touches.length!==1){cancel();return;}
    const origin=touches[0];
    contact={origin,mode:handlers.begin(origin),distance:0};
  });
  function delta(touch) {
    const dx=touch.x-contact.origin.x, dy=touch.y-contact.origin.y;
    contact.distance=Math.max(contact.distance,Math.hypot(dx,dy));
    return {dx,dy};
  }
  platform.onMove(touches=>{
    if(!contact)return;
    const touch=touches.find(t=>t.id===contact.origin.id);
    if(!touch)return;
    const {dx,dy}=delta(touch);
    if(contact.distance>8)handlers.move(contact.mode,touch,dx,dy);
  });
  platform.onEnd(touches=>{
    if(!contact)return;
    const touch=touches.find(t=>t.id===contact.origin.id);
    if(!touch)return;
    const {dx,dy}=delta(touch);
    const {origin,mode,distance}=contact;
    contact=null;
    handlers.end(mode,origin,touch,dx,dy,distance<=10);
  });
  platform.onHide(cancel);
  platform.onCancel(cancel);
  return {cancel};
}
module.exports={createGestureInput};
