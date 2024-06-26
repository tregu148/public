<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>改良版 インフレゲーム - 年ごとデータ集約版</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.7.1/chart.min.js"></script>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        button { margin: 5px; padding: 10px; font-size: 16px; }
        #game-log { border: 1px solid #ccc; padding: 10px; margin-top: 20px; height: 150px; overflow-y: scroll; }
        .chart-container { margin-top: 20px; height: 300px; }
        #current-year { font-size: 24px; font-weight: bold; color: #4a4a4a; margin-bottom: 10px; }
    </style>
</head>
<body>
    <h1>リンゴゲーム</h1>
    <div id="current-year"></div>
    <div id="game-status"></div>
    <div id="actions">
        <button onclick="buyAsset()">🍌 を買う</button>
        <button onclick="sellAsset()">🍌 を売る</button>
        <button onclick="buyVictoryPoints()">🍎 を買う</button>
        <button onclick="nextYear()">次の年へ</button>
        <button onclick="endGame()">終了</button>
        <button onclick="restartGame()">リスタート</button>
    </div>
    <div id="game-log"></div>
    <div class="chart-container">
        <canvas id="assetChart"></canvas>
    </div>
    <div class="chart-container">
        <canvas id="bananaChart"></canvas>
    </div>

    <script>
        let cash, bananas, bananaPrice, apples, applePrice, currentYear, assetChart, bananaChart;
        const maxYears = 10;
        const baseInflation = 0.05;
        const bananaMeanReturn = 0.10;
        const bananaStdDev = 0.20;
        const appleReturn = 0.10;
        let isGameEnded = false;

        let chartData = {
            labels: [], cashData: [], bananaValueData: [], 
            totalValueData: [], appleCountData: [], bananaPriceData: []
        };

        function initializeGame() {
            cash = 1000; bananas = 0; bananaPrice = 100; apples = 0; applePrice = 200; currentYear = 1;
            isGameEnded = false;
            chartData = {
                labels: [], cashData: [], bananaValueData: [], 
                totalValueData: [], appleCountData: [], bananaPriceData: []
            };
            updateGameStatus();
            updateCharts();
            log('ゲームを開始しました。目標：できるだけ多くの🍎を集めよう！');
        }

        function updateGameStatus() {
            const bananaValue = bananas * bananaPrice;
            const totalValue = cash + bananaValue;
            const appleDisplay = '🍎'.repeat(apples);
            document.getElementById('current-year').innerText = `現在の年: ${currentYear}年目`;
            document.getElementById('game-status').innerHTML = `
                <p>現金: ¥${cash.toFixed(0)}</p>
                <p>🍌: ${bananas} 個 (1個 = ¥${bananaPrice.toFixed(0)}) 総額: ¥${bananaValue.toFixed(0)}</p>
                <p>🍎: ${appleDisplay}：${apples}個 (1個 = ¥${applePrice.toFixed(0)})</p>
                <p>総資産: ¥${totalValue.toFixed(0)}</p>
            `;
            
            if (chartData.labels.length < currentYear) {
                chartData.labels.push(`${currentYear}年`);
                chartData.cashData.push(cash);
                chartData.bananaValueData.push(bananaValue);
                chartData.totalValueData.push(totalValue);
                chartData.appleCountData.push(apples);
                chartData.bananaPriceData.push(bananaPrice);
            } else {
                chartData.cashData[currentYear - 1] = cash;
                chartData.bananaValueData[currentYear - 1] = bananaValue;
                chartData.totalValueData[currentYear - 1] = totalValue;
                chartData.appleCountData[currentYear - 1] = apples;
                chartData.bananaPriceData[currentYear - 1] = bananaPrice;
            }
        }

        function log(message) {
            const gameLog = document.getElementById('game-log');
            gameLog.innerHTML += `<p>[${currentYear}年目] ${message}</p>`;
            gameLog.scrollTop = gameLog.scrollHeight;
        }

        function buyAsset() {
            if (isGameEnded || cash < bananaPrice) return log(cash < bananaPrice ? '現金が足りません。' : '');
            cash -= bananaPrice;
            bananas += 1;
            log(`1個の🍌を ¥${bananaPrice.toFixed(0)} で購入しました。`);
            updateGameStatus();
            updateCharts();
        }

        function sellAsset() {
            if (isGameEnded || bananas === 0) return log(bananas === 0 ? '売却可能な🍌がありません。' : '');
            cash += bananaPrice;
            bananas -= 1;
            log(`1個の🍌を ¥${bananaPrice.toFixed(0)} で売却しました。`);
            updateGameStatus();
            updateCharts();
        }

        function buyVictoryPoints() {
            if (isGameEnded || cash < applePrice) return log(cash < applePrice ? '現金が足りません。' : '');
            cash -= applePrice;
            apples += 1;
            log(`1個の🍎を ¥${applePrice.toFixed(0)} で購入しました。`);
            updateGameStatus();
            updateCharts();
        }

        function nextYear() {
            if (isGameEnded) return;
            currentYear++;
            const u1 = Math.random(), u2 = Math.random();
            const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            const bananaGrowth = bananaMeanReturn + bananaStdDev * z;

            bananaPrice *= (1 + bananaGrowth);
            applePrice *= (1 + appleReturn);

            log(`${currentYear}年目が始まりました:`);
            log(`🍌価格変動: ${(bananaGrowth * 100).toFixed(1)}%`);
            log(`🍎価格上昇: ${(appleReturn * 100).toFixed(1)}%`);

            updateGameStatus();
            updateCharts();

            if (currentYear > maxYears) {
                log('最終年を過ぎました。いつでもゲームを終了できます。');
            }
        }

        function endGame() {
            if (isGameEnded) return;
            isGameEnded = true;
            const appleDisplay = '🍎'.repeat(apples);
            log(`ゲーム終了！最終スコア: ${appleDisplay}：${apples}個`);
            document.querySelectorAll('button').forEach(btn => {
                if (btn.textContent !== 'リスタート') btn.disabled = true;
            });
        }

        function restartGame() {
            document.getElementById('game-log').innerHTML = '';
            document.querySelectorAll('button').forEach(btn => btn.disabled = false);
            initializeGame();
        }

        function updateCharts() {
            if (assetChart) {
                assetChart.data.labels = chartData.labels;
                assetChart.data.datasets[0].data = chartData.cashData;
                assetChart.data.datasets[1].data = chartData.bananaValueData;
                assetChart.data.datasets[2].data = chartData.appleCountData;
                assetChart.update();
            } else {
                const ctx = document.getElementById('assetChart').getContext('2d');
                assetChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: chartData.labels,
                        datasets: [{
                            label: '現金',
                            data: chartData.cashData,
                            backgroundColor: 'rgba(54, 162, 235, 0.5)',
                            order: 1
                        }, {
                            label: '🍌価値',
                            data: chartData.bananaValueData,
                            backgroundColor: 'rgba(255, 206, 86, 0.5)',
                            order: 1
                        }, {
                            label: '🍎数',
                            data: chartData.appleCountData,
                            type: 'line',
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 2,
                            fill: false,
                            yAxisID: 'y1',
                            order: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                stacked: true,
                                offset: true,
                                grid: {
                                    offset: true
                                }
                            },
                            y: {
                                stacked: true,
                                beginAtZero: true,
                                title: { display: true, text: '価値 (円)' }
                            },
                            y1: {
                                position: 'right',
                                beginAtZero: true,
                                title: { display: true, text: '🍎数' }
                            }
                        },
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        let label = context.dataset.label || '';
                                        if (label) {
                                            label += ': ';
                                        }
                                        if (context.datasetIndex === 2) {
                                            label += context.parsed.y + '個';
                                        } else if (context.parsed.y !== null) {
                                            label += new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(context.parsed.y);
                                        }
                                        return label;
                                    }
                                }
                            }
                        }
                    }
                });
            }

            if (bananaChart) {
                bananaChart.data.labels = chartData.labels;
                bananaChart.data.datasets[0].data = chartData.bananaPriceData;
                bananaChart.update();
            } else {
                const ctx = document.getElementById('bananaChart').getContext('2d');
                bananaChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: chartData.labels,
                        datasets: [{
                            label: '🍌価格',
                            data: chartData.bananaPriceData,
                            borderColor: 'rgba(255, 206, 86, 1)',
                            borderWidth: 2,
                            fill: false
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            x: {
                                offset: true,
                                grid: {
                                    offset: true
                                }
                            },
                            y: {
                                beginAtZero: true,
                                title: { display: true, text: '🍌価格 (円)' }
                            }
                        }
                    }
                });
            }
        }

        window.onload = initializeGame;
    </script>
</body>
</html>
