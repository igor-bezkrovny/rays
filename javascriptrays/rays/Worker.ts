//import java.util.concurrent.ThreadLocalRandom;
//import rays.Raycaster.vector;

///<reference path="vector.ts"/>

namespace Raycaster {
	class Worker {

		// Default pixel color is almost pitch black
		private _DEF_COLOR = new vector(13, 13, 13);

		private _EMPTY_VEC   = new vector();
		private _SKY_VEC     = new vector(.7, .6, 1);
		private _STD_VEC     = new vector(0, 0, 1);
		private _S_CONST_VEC = new vector(17, 16, 8);
		private _T_CONST_VEC = new vector(0, 3, -4);
		private _PATTERN1    = new vector(3, 1, 1);
		private _PATTERN2    = new vector(3, 3, 3);

		// for stochastic sampling
		private _offset : number;
		private _jump : number;

		private _objects : vector[];

		private _t : number;
		private _n : vector;

		constructor(objects : vector[], offset : number, jump : number) {
			this._objects = objects;
			this._offset  = offset;
			this._jump    = jump;
		}

		//The intersection test for line [o,v].
		// Return 2 if a hit was found (and also return distance t and bouncing ray n).
		// Return 0 if no hit was found but ray goes upward
		// Return 1 if no hit was found but ray goes downward
		private T(o : vector, d : vector) : number {
			this._t = 1e9;
			var m   = 0;
			var p   = -o.z / d.z;

			this._n = this._EMPTY_VEC;
			if (.01 < p) {
				this._t = p;
				this._n = this._STD_VEC;
				m       = 1;
			}

			o                 = o.add(this._T_CONST_VEC);
			var last : vector = null;
			for (var i = 0; i < this._objects.length; i++) {
				// There is a sphere but does the ray hits it ?
				var p1 : vector  = o.add(this._objects[ i ]);
				const b : number = p1.dot(d), c = p1.dot(p1) - 1, b2 = b * b;

				// Does the ray hit the sphere ?
				if (b2 > c) {
					// It does, compute the distance camera-sphere
					const q = b2 - c,
						  s = -b - Math.sqrt(q);

					if (s < this._t && s > .01) {
						last    = p1;
						this._t = s;
						m       = 2;
					}
				}
			}

			if (last != null) {
				this._n = (last.add(d.mul(this._t))).norm();
			}

			return m;
		}

		// (S)ample the world and return the pixel color for
		// a ray passing by point o (Origin) and d (Direction)
		private S(o : vector, d : vector) : vector {
			// Search for an intersection ray Vs World.
			const m           = this.T(o, d);
			const on : vector = new vector(this._n);

			if (m == 0) { // m==0
				// No sphere found and the ray goes upward: Generate a sky color
				var p = 1 - d.z;
				p     = p * p;
				p     = p * p;
				return this._SKY_VEC.mul(p);
			}

			// A sphere was maybe hit.
			var h : vector = o.add(d.mul(this._t)); // h = intersection coordinate
			const l : vector = (new vector(9 + Math.random(), 9 + Math.random(), 16).add(h.mul(-1))).norm(); // 'l' = direction to light (with random delta for soft-shadows).

			// Calculated the lambertian factor
			let b = l.dot(this._n);

			// Calculate illumination factor (lambertian coefficient > 0 or in shadow)?
			if (b < 0 || this.T(h, l) != 0) {
				b = 0;
			}

			if (m == 1) { // m == 1
				h = h.mul(.2); // No sphere was hit and the ray was going downward: Generate a floor color
				return ((Math.ceil(h.x) + Math.ceil(h.y) & 1) == 1 ? this._PATTERN1 : this._PATTERN2).mul(b * .2 + .1);
			}

			const r = d.add(on.mul(on.dot(d.mul(-2)))); // r = The half-vector

			// Calculate the color 'p' with diffuse and specular component
			let p   = l.dot(r.mul(b > 0 ? 1 : 0));
			let p33 = p * p;
			p33     = p33 * p33;
			p33     = p33 * p33;
			p33     = p33 * p33;
			p33     = p33 * p33;
			p33     = p33 * p;
			p       = p33 * p33 * p33;

			// m == 2 A sphere was hit. Cast an ray bouncing from the sphere surface.
			return new vector(p, p, p).add(this.S(h, r).mul(.5)); // Attenuate color by 50% since it is bouncing (*.5)
		}

		run() {
			for (var y = this._offset; y < Raycaster.h; y += this._jump) { // For each row
				var k = (Raycaster.h - y - 1) * Raycaster.w * 3;

				for (var x = Raycaster.w; x-- > 0;) { // For each pixel in a line
					// Reuse the vector class to store not XYZ but a RGB pixel
					// color
					const p : vector       = this.innerLoop(y, x, this._DEF_COLOR);
					Raycaster.bytes[ k++ ] = (p.x & 255) >>> 0;
					Raycaster.bytes[ k++ ] = (p.y & 255) >>> 0;
					Raycaster.bytes[ k++ ] = (p.z & 255) >>> 0;
				}
			}
		}

		private innerLoop(y : number, x : number, p : vector) : vector {
			// Cast 64 rays per pixel (For blur (stochastic sampling)
			// and soft-shadows.
			for (let r = 64; r-- > 0;) {
				// The delta to apply to the origin of the view (For
				// Depth of View blur).
				const t = Raycaster.a.mul(Math.random() - .5).mul(99).add(Raycaster.b.mul(Math.random() - .5).mul(99)); // A little bit of delta up/down and left/right

				// Set the camera focal point vector(17,16,8) and Cast the ray
				// Accumulate the color returned in the p variable
				p = this.S(this._S_CONST_VEC.add(t), // Ray Origin
					t.mul(-1).add((Raycaster.a.mul(Math.random() + x).add(Raycaster.b.mul(y + Math.random())).add(Raycaster.c)).mul(16)).norm() // Ray Direction with random deltas
				).mul(3.5).add(p); // +p for color accumulation
			}
			return p;
		}
	}
