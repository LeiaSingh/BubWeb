// NAVIGATION

const navButtons = document.querySelectorAll('.nav-btn');
const listPage = document.getElementById('list-page');
const reviewsPage = document.getElementById('reviews-page');

//listen for clicks 
navButtons.forEach(button => {
    button.addEventListener('click', () => {
        navButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        if (button.textContent.toLowerCase().includes('list')){
            listPage.classList.remove('hidden');
            reviewsPage.classList.add('hidden');
        } else {
            reviewsPage.classList.remove('hidden');
            listPage.classList.add('hidden');

            runScoreTest();
        }
    });
});

//CALCULATOR
function calculateAdventureScore(nikScore, leiScore) {
    let totalScore = 0;
    let totalCategories = nikScore.length +  leiScore.length;

    nikScore.forEach(score => totalScore += score);
    leiScore.forEach(score => totalScore += score);

    let finalAvg = totalScore/totalCategories;

    return finalAvg.toFixed(2);
}

//test example
function runScoreTest() {
    const nikScore = [8,9,9];
    const leiScore = [9, 8, 7];

    const finalRating = calculateAdventureScore(nikScore, leiScore);

    const displayElement = document.getElementById('average-display');
    displayElement.innerHTML= `🌌 <strong>Planetarium Trip Shared Rating:</strong> ${finalRating} / 10`;
}