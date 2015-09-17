///<reference path="../node.d.ts"/>
///<reference path="vector.ts"/>
var child_process = require("child_process"),
	os            = require('os'),
	path          = require("path");

let debugPort = 0;
for (const arg of (<any>process).execArgv) {
	const p = arg.split("=");
	if (p[ 0 ] === "--debug-brk") {
		debugPort = parseInt(p[ 1 ], 10) + 1;
	}
}

function fork(file : string, callback : (data : any) => void) {
	var scheduledDataToSend = null,
		started             = false,
		sent = false,
		online = false;

	var worker = child_process.fork(
		file,
		{ execArgv : debugPort ? [ `--debug-brk=${debugPort++}` ] : [] }
	);

	worker.on("message", (data) => {
		switch (data.type) {
			case "online":
				// timeout is for debugging in JetBrains WebStorm. When running from command line, no delay is needed
				online = true;
				tryToSend();
				break;

			default:
				worker.kill();
				callback(data.data);
				break;
		}
	});

	function tryToSend() {
		if(!sent && started && online) {
			sent = true;
			worker.send(scheduledDataToSend);
			scheduledDataToSend = null;
		}
	}

	return {
		start : (data : any) => {
			if (!started) {
				scheduledDataToSend = data;
				tryToSend();
				started = true;
			} else {
				throw new Error("start can be called only once");
			}
		}
	}
}

namespace Raycaster {
	var art : string[][] = [
		"                   ".split(""),
		"    1111           ".split(""),
		"   1    1          ".split(""),
		"  1           11   ".split(""),
		"  1          1  1  ".split(""),
		"  1     11  1    1 ".split(""),
		"  1      1  1    1 ".split(""),
		"   1     1   1  1  ".split(""),
		"    11111     11   ".split("")
	];

	function F() : vector[] {
		const nr                   = art.length,
			  nc                   = art[ 0 ].length,
			  tmp : Vector<vector> = new Vector<>(nr * nc);

		for (let k = nc - 1; k >= 0; k--) {
			for (let j = nr - 1; j >= 0; j--) {
				if (art[ j ][ nc - k - 1 ] != ' ') {
					tmp.add(new vector(-k, 0, j - nr + 1));
				}
			}
		}
		return tmp.toArray(new vector[ 0 ]);
	}

	var STD_VEC : vector = new vector(0, 0, 1);

	var w = 512, h = 512;
	var bytes;

	// WTF ? See https://news.ycombinator.com/item?id=6425965 for more.
	const g : vector = (new vector(-5.5, -16, 0)).norm();

	const a : vector = (STD_VEC.pow(g)).norm().mul(.002);
	const b : vector = (g.pow(a)).norm().mul(.002);
	const c : vector = (a.add(b)).mul(-256).add(g);

	export function main() {
		const objects = F(),
			  args    = Array.prototype.slice.call(process.argv, 2);

		var num_threads = os.cpus();

		if (args.length > 0) {
			w = parseInt(args[ 0 ]);
		}

		if (args.length > 1) {
			h = parseInt(args[ 1 ]);
		}

		if (args.length > 2) {
			num_threads = parseInt(args[ 2 ]);
		}

		var stream : BufferedOutputStream = new BufferedOutputStream(System.out);
		//stream.write("".format("P6 %d %d 255 ", w, h).getBytes());

		bytes = new Buffer(3 * w * h);

		//let threads : Thread[] = [];
		var threads_left = num_threads;
		for (let i = 0; i < num_threads; i++) {
			const thread = fork("./Worker.js", (data) => {
				threads_left--;
				if(threads_left === 0) {
					stream.write(bytes);
					stream.flush();
				}
			});

			thread.start({
				objects,
				i,
				num_threads
			});
		}
	}
}
