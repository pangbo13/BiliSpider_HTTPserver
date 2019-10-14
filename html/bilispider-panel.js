function requestData() {
	$.ajax({
		url: 'http://192.168.0.114:1214/data',
		success: function (data) {
			$(".chart").removeClass("non-display")

			var shift = cpu_chart.series[0].data.length > 60; // 当数据点数量超过 20 个，则指定删除第一个点

			// 新增点操作
			//具体的参数详见：https://api.hcharts.cn/highcharts#Series.addPoint
			var now_time = (new Date()).getTime();
			// for (var i = 0 ; i < data.sys.cpu.usage.length ; i++){
			// for (var i = 0 ; i < 5 ; i++){
			// 	chart.series[i].addPoint([now_time, data.sys.cpu.usage[i]], true, shift);
			// }
			var cpu_usage = 0;
			for (var i = 0; i < data.sys.cpu.usage.length; i++) {
				cpu_usage += data.sys.cpu.usage[i]
			}
			cpu_usage = parseFloat((cpu_usage / data.sys.cpu.usage.length + 0.5).toFixed(2));
			mem_usage = data.sys.mem.percent
			cpu_chart.series[0].addPoint([now_time, cpu_usage], true, shift);
			mem_chart.series[0].addPoint([now_time, mem_usage], true, shift);


			var percentage = parseInt(data["spider"]["percentage"] * 1000) / 10;
			if (percentage === NaN || percentage < 0) percentage = 0;
			else {
				if (percentage > 100) percentage = 100;
			};
			var progress_val_width = parseInt($("#progress-bar").width() * percentage / 100).toString() +
				"px";
			$("#progress-val").animate({
				width: progress_val_width
			});
			
			if (!$.isEmptyObject(data.spider)) {
				$(".spider_chart").removeClass("non-display")
				var threaddata = [];
				for (var i = 0; i < data.spider.pages_get_by_threads.length; i++) {
					threaddata.push(["线程" + (i+1), data.spider.pages_get_by_threads[i]])
				}
				thread_chart.series[0].setData(threaddata);

				queue_chart.series[0].setData([data.spider.queue_len]);

				var speed = parseInt(data.spider.got_pages * 1000 / (data.spider.monitor_circles)) / 100;
				speed_chart.series[0].setData([speed]);
			}
			else{
				$(".spider_chart").addClass("non-display");
			}
			// 一秒后继续调用本函数
			setTimeout(requestData, 1000);
		},
		error: function () {
			$(".chart").addClass("non-display");
			$("#show-error").removeClass("non-display");
			setTimeout(requestData, 2000);
		},
		cache: false
	});
}
$(document).ready(function () {
	// for(var i=0;i<12;i++){
	// 	series[i] = {
	// 		name: 'cpu' + i,
	// 		data: []
	// 	}
	// };

	cpu_chart = Highcharts.chart('cpu_chart', {
		chart: {
			type: 'area',
			events: {
				load: requestData // 图表加载完毕后执行的回调函数
			}
		},
		title: {
			text: 'CPU usage'
		},
		xAxis: {
			type: 'datetime',
			tickPixelInterval: 150,
			maxZoom: 20 * 1000
		},
		yAxis: {
			minPadding: 0.2,
			maxPadding: 0.2,
			title: {
				enabled: false,
				text: 'usage(%)',
				margin: 80
			}
		},
		legend: {
			enabled: 0
		},
		plotOptions: {
			area: {
				marker: {
					enabled: false,
					symbol: 'circle',
					radius: 2,
					states: {
						hover: {
							enabled: true
						}
					}
				}
			}
		},
		credits: {
			enabled: false
		},
		series: [{
			name: 'cpu',
			data: [],
			fillOpacity: 0.25,
		}]
	});

	mem_chart = Highcharts.chart('mem_chart', {
		chart: {
			type: 'area',
			// events: {
			// 	load: requestData // 图表加载完毕后执行的回调函数
			// }
		},
		title: {
			text: 'mem usage'
		},
		xAxis: {
			type: 'datetime',
			tickPixelInterval: 150,
			maxZoom: 20 * 1000
		},
		yAxis: {
			minPadding: 0.2,
			maxPadding: 0.2,
			title: {
				enabled: false,
				text: 'usage(%)',
				margin: 80
			}
		},
		legend: {
			enabled: 0
		},
		plotOptions: {
			area: {
				marker: {
					enabled: false,
					symbol: 'circle',
					radius: 2,
					states: {
						hover: {
							enabled: true
						}
					}
				}
			}
		},
		credits: {
			enabled: false
		},
		// plotOptions: {
		// 	area: {
		// 		fillColor: {
		// 			linearGradient: {
		// 				x1: 0,
		// 				y1: 0,
		// 				x2: 0,
		// 				y2: 1
		// 			}
		// 		}
		// 	}
		// },
		series: [{
			name: 'mem',
			data: [],
			color: Highcharts.getOptions().colors[2],
			fillOpacity: 0.25,
		}]
	});

	thread_chart = Highcharts.chart('thread_chart', {
		xAxis: [{
			type: "category",
			index: 0,
			isX: true
		}],
		title: {
			text: "线程获取量"
		},
		series: [{
			name: "已获取页数",
			data: []
		}],
		chart: {
			style: {
				fontFamily: "\"微软雅黑\", Arial, Helvetica, sans-serif",
				color: "#333",
				fontSize: "12px",
				fontWeight: "normal",
				fontStyle: "normal"
			},
			type: "pie"
		},
		credits: {
			enabled: false
		},
		tooltip: {
			useHTML: true,
			followPointer: true
		},
		noData: {
			position: {
				verticalAlign: "middle"
			},
			style: {
				fontWeight: "bold",
				fontSize: "223px",
				color: "#666666"
			}
		},
		plotOptions: {
			series: {
				dataLabels: {
					allowOverlap: false,
					enabled: false
				}
			},
			pie: {
				allowPointSelect: false,
				cursor: true
			}
		},
		exporting: {
			enabled: false,
			fallbackToExportServer: false
		},
		colors: [
			"#90ed7d",
			"#f7a35c",
			"#8085e9",
			"#f15c80",
			"#e4d354",
			"#2b908f",
			"#f45b5b",
			"#91e8e1"
		]
	})

	queue_chart = Highcharts.chart('queue_chart', {
		plotOptions: {
			solidgauge: {
				dataLabels: {
					y: 5,
					borderWidth: 0,
					useHTML: true
				}
			}
		},
		tooltip: {
			enabled: false
		},
		chart: {
			type: 'solidgauge'
		},
		title: null,
		pane: {
			center: ['50%', '85%'],
			size: '100%',
			startAngle: -90,
			endAngle: 90,
			background: {
				backgroundColor: (Highcharts.theme && Highcharts.theme.background2) || '#EEE',
				innerRadius: '60%',
				outerRadius: '100%',
				shape: 'arc'
			}
		},
		yAxis: {
			min: 0,
			max: 50,
			title: {
				text: '队列长度',
				y: -100,
				style: {
					"fontSize": "18px"
				}
			},
			stops: [
				[0.1, '#55BF3B'], // green
				[0.5, '#DDDF0D'], // yellow
				[0.9, '#DF5353'] // red
			],
			lineWidth: 0,
			minorTickInterval: null,
			tickPixelInterval: 400,
			tickWidth: 0,
			labels: {
				y: 16
			}
		},
		credits: {
			enabled: false
		},
		noData: {
			position: {
				verticalAlign: "middle"
			},
			style: {
				fontWeight: "bold",
				fontSize: "223px",
				color: "#666666"
			}
		},
		series: [{
			name: '队列长度',
			data: [],
			dataLabels: {
				format: '<div style="text-align:center"><span style="font-size:25px;color:' +
					((Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black') +
					'">{y}</span><br/>'
			},
			tooltip: {
				valueSuffix: ''
			}
		}]
	});

	speed_chart = Highcharts.chart('speed_chart', {
		chart: {
			type: 'gauge',
			plotBackgroundColor: null,
			plotBackgroundImage: null,
			plotBorderWidth: 0,
			plotShadow: false
		},
		tooltip: {
			enabled: false
		},
		title: {
			text: '平均速度'
		},
		pane: {
			startAngle: -150,
			endAngle: 150,
			size: "105%",
		},
		// the value axis
		yAxis: {
			min: 0,
			max: 14,
			minorTickInterval: 'auto',
			minorTickWidth: 1,
			minorTickLength: 10,
			minorTickPosition: 'inside',
			minorTickColor: '#666',
			tickPixelInterval: 30,
			tickWidth: 2,
			tickPosition: 'inside',
			tickLength: 10,
			tickColor: '#666',
			labels: {
				step: 2,
				rotation: 'auto',
			},
			title: {
				text: '项数'
			},
			plotBands: [{
				from: 0,
				to: 5,
				color: '#55BF3B' // green
			}, {
				from: 5,
				to: 12,
				color: '#DDDF0D' // yellow
			}, {
				from: 12,
				to: 15,
				color: '#DF5353' // red
			}]
		},
		credits: {
			enabled: false
		},
		series: [{
			name: 'Speed',
			data: [0],
		}, ]
	});
});