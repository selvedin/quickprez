DB.open().then(function () {
  new Vue({
    el: '#app',
    template: '<span class="app-loading">PresentationForge</span>',
  });
}).catch(function (err) {
  document.getElementById('app').textContent = 'Failed to open database: ' + err.message;
});
