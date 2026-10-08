// Change this line in server.js:
app.use(express.static(path.join(__dirname, '../frontend')));

// To this:
app.use(express.static(path.join(__dirname, '.')));

// Or better yet, create a specific route for the index:
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});