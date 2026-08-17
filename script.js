// Simple pinboard behavior: editable pins, drag/drop to completed, and gentle swinging
(function(){
    const pinsContainer = document;
    const completedDrop = document.getElementById('completedDrop');
    const completedList = document.getElementById('completedList');

    // Assign unique ids if missing
    document.querySelectorAll('.pin').forEach((p, i) => {
        if (!p.dataset.id) p.dataset.id = 'pin-' + (Date.now() + i);
    });

    // Drag handlers
    pinsContainer.addEventListener('dragstart', (e) => {
        const pin = e.target.closest('.pin');
        if (!pin) return;
        e.dataTransfer.setData('text/plain', pin.dataset.id);
        pin.classList.add('dragging');
        setTimeout(()=> pin.classList.add('invisible'), 20);
    });
    pinsContainer.addEventListener('dragend', (e) => {
        const pin = e.target.closest('.pin');
        if (!pin) return;
        pin.classList.remove('dragging','invisible');
    });

    // Dropzone
    completedDrop.addEventListener('dragover', (e)=>{
        e.preventDefault();
        completedDrop.classList.add('drag-over');
    });
    completedDrop.addEventListener('dragleave', ()=>{
        completedDrop.classList.remove('drag-over');
    });
    completedDrop.addEventListener('drop', (e)=>{
        e.preventDefault();
        completedDrop.classList.remove('drag-over');
        const id = e.dataTransfer.getData('text/plain');
        const pin = document.querySelector(`.pin[data-id="${id}"]`);
        if (pin) completePin(pin);
    });

    // Complete buttons
    document.addEventListener('click', (e)=>{
        if (e.target.classList.contains('complete-btn')){
            const pin = e.target.closest('.pin');
            if (pin) completePin(pin);
        }
    });

    // Color picker
    document.addEventListener('input', (e)=>{
        if (e.target.classList && e.target.classList.contains('color-picker')){
            const pin = e.target.closest('.pin');
            if (pin) pin.style.background = e.target.value;
        }
    });

    // Hover interactions for a little nudge
    document.addEventListener('mouseenter', (e)=>{
        const pin = e.target.closest && e.target.closest('.pin');
        if (!pin) return;
        pin.classList.add('hovered');
        // stop swing being too subtle
        pin.dataset._hover = '1';
    }, true);
    document.addEventListener('mouseleave', (e)=>{
        const pin = e.target.closest && e.target.closest('.pin');
        if (!pin) return;
        pin.classList.remove('hovered');
        delete pin.dataset._hover;
    }, true);

    function completePin(pin){
        // gather values
        const title = (pin.querySelector('.pin-title') || {}).innerText || 'Untitled';
        const desc = (pin.querySelector('.pin-desc') || {}).innerText || '';
        const color = window.getComputedStyle(pin).backgroundColor || '#fff';

        // Create completed item
        const item = document.createElement('div');
        item.className = 'completed-item';
        item.innerHTML = `<strong class="completed-title">${escapeHtml(title)}</strong><p class="completed-desc">${escapeHtml(desc)}</p>`;
        item.style.background = color;

        // simple toss animation: start from pin location and fly to completedList
        const rect = pin.getBoundingClientRect();
        const destRect = completedList.getBoundingClientRect();

        // place a flying clone
        const clone = pin.cloneNode(true);
        clone.style.position = 'fixed';
        clone.style.left = rect.left + 'px';
        clone.style.top = rect.top + 'px';
        clone.style.width = rect.width + 'px';
        clone.style.zIndex = 9999;
        clone.classList.add('toss-away');
        document.body.appendChild(clone);

        // force reflow then animate toward dest
        requestAnimationFrame(()=>{
            const dx = (destRect.left + 10) - rect.left + (Math.random()*40-20);
            const dy = (destRect.top + 10) - rect.top + (Math.random()*20-10);
            clone.style.transform = `translate(${dx}px, ${dy}px) rotate(${(Math.random()*60-30)}deg) scale(.9)`;
            clone.style.opacity = '0.0';
        });

        // after animation: remove clone and append completed item
        setTimeout(()=>{
            clone.remove();
            completedList.prepend(item);
        }, 620);

        // remove original pin from board
        pin.remove();
    }

    // Escape for text injected into innerHTML for safety
    function escapeHtml(s){
        return String(s).replace(/[&<>\"']/g, function(c){
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c];
        });
    }

    // Swing animation for pins: lightweight loop using transform
    const pinStates = new Map();
    function ensurePinState(pin){
        if (!pinStates.has(pin)){
            pinStates.set(pin, {
                phase: Math.random()*Math.PI*2,
                speed: 0.0008 + Math.random()*0.0012,
                amp: 1 + Math.random()*2.2,
                sway: 0.5 + Math.random()*2,
            });
        }
        return pinStates.get(pin);
    }

    function animate(time){
        document.querySelectorAll('.pin').forEach(pin => {
            const st = ensurePinState(pin);
            const hover = pin.dataset._hover ? 2.2 : 1.0;
            const angle = Math.sin(time*st.speed + st.phase) * st.amp * hover;
            const x = Math.cos(time*st.speed*0.7 + st.phase) * st.sway * hover;
            // if pin is being dragged, reduce motion
            if (pin.classList.contains('dragging')) {
                pin.style.transform = '';
            } else {
                pin.style.transform = `translateX(${x}px) rotate(${angle}deg)`;
            }
        });
        requestAnimationFrame(animate);
    }

    // Start animation loop
    requestAnimationFrame(animate);

    // Allow new pins added dynamically to be interactive (delegated handlers above)
})();
