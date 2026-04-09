DB.open().then(function () {
  Router.register('#dashboard', DashboardPage);
  Router.register('#editor/:id', EditorPage);
  Router.register('#player/:id', PlayerPage);
  Router.init(document.getElementById('app'));
}).catch(function (err) {
  document.getElementById('app').textContent = 'Failed to open database: ' + err.message;
});
