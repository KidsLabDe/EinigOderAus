document.addEventListener('keydown', (e) => {
    const key = e.key;
    if (['1', '2', '9', '0'].includes(key)) {
        if (typeof socket !== 'undefined') {
            socket.emit('keypress', { key: key });
        }
    }
});
