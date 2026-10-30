const toggles = document.querySelectorAll('.toggle');

toggles.forEach((toggle) => {
  toggle.addEventListener('click', () => {
    const answer = toggle.parentNode.querySelector('.answer');
    const li = toggle.parentNode;
    li.classList.toggle('active');
    answer.style.display = li.classList.contains('active') ? 'block' : 'none';
  });
});