namespace Raycaster {
	export class vector {
		x : number;
		y : number;
		z : number;

		constructor();
		constructor(v : vector);
		constructor(a : number, b : number, c : number);
		constructor() {
			this.x = this.y = this.z = 0.0;
			switch (arguments.length) {
				case 0:
					break;
				case 1:
					const v : vector = arguments[ 0 ];
					this.x           = v.x;
					this.y           = v.y;
					this.z           = v.z;
					break;
				case 3:
					this.x = arguments[ 0 ];
					this.y = arguments[ 1 ];
					this.z = arguments[ 2 ];
					break;
			}
		}

		add(r : vector) : vector {
			return new vector(this.x + r.x, this.y + r.y, this.z + r.z);
		}

		dot(r : vector) : number {
			return this.x * r.x + this.y * r.y + this.z * r.z;
		}

		mul(r : number) : vector {
			return new vector(this.x * r, this.y * r, this.z * r);
		}

		norm() : vector {
			return this.mul((1.0 / Math.sqrt(this.dot(this))));
		}

		pow(r : vector) : vector {
			return new vector(this.y * r.z - this.z * r.y, this.z * r.x - this.x * r.z, this.x * r.y - this.y * r.x);
		}
	}

}
