const VERSION = "3000.0.0-beta.2"

import {
	sat,
	vec2,
	Rect,
	Polygon,
	Line,
	Circle,
	Color,
	Vec2,
	Mat4,
	Quad,
	RNG,
	quad,
	rgb,
	hsl2rgb,
	rand,
	randi,
	randSeed,
	chance,
	choose,
	clamp,
	lerp,
	map,
	mapc,
	wave,
	testLinePoint,
	testLineLine,
	testLineCircle,
	testRectRect,
	testRectLine,
	testRectPoint,
	testPolygonPoint,
	testCirclePoint,
	testCirclePolygon,
	deg2rad,
	rad2deg,
} from "./math"

import easings from "./easings"

import {
	IDList,
	Event,
	EventHandler,
	download,
	downloadText,
	downloadJSON,
	downloadBlob,
	uid,
	isDataURL,
	getExt,
	deepEq,
	dataURLToArrayBuffer,
	EventController,
	// eslint-disable-next-line
	warn,
	// eslint-disable-next-line
	benchmark,
	// eslint-disable-next-line
	comparePerf,
	BinaryHeap,
} from "./utils"

import type {
	GfxShader,
	GfxFont,
	RenderProps,
	CharTransform,
	TextureOpt,
	FormattedText,
	FormattedChar,
	DrawRectOpt,
	DrawLineOpt,
	DrawLinesOpt,
	DrawTriangleOpt,
	DrawPolygonOpt,
	DrawCircleOpt,
	DrawEllipseOpt,
	DrawUVQuadOpt,
	Vertex,
	BitmapFontData,
	ShaderData,
	LoadSpriteSrc,
	LoadSpriteOpt,
	SpriteAtlasData,
	LoadBitmapFontOpt,
	KaboomCtx,
	KaboomOpt,
	AudioPlay,
	AudioPlayOpt,
	DrawSpriteOpt,
	DrawTextOpt,
	TextAlign,
	GameObj,
	SceneID,
	SceneDef,
	CompList,
	Comp,
	Tag,
	Key,
	MouseButton,
	PosComp,
	ScaleComp,
	RotateComp,
	ColorComp,
	OpacityComp,
	Anchor,
	AnchorComp,
	ZComp,
	FollowComp,
	MoveComp,
	OffScreenCompOpt,
	OffScreenComp,
	AreaCompOpt,
	AreaComp,
	SpriteComp,
	SpriteCompOpt,
	SpriteAnimPlayOpt,
	SpriteAnims,
	TextComp,
	TextCompOpt,
	RectComp,
	RectCompOpt,
	UVQuadComp,
	CircleComp,
	OutlineComp,
	TimerComp,
	BodyComp,
	BodyCompOpt,
	Uniform,
	ShaderComp,
	FixedComp,
	StayComp,
	HealthComp,
	LifespanComp,
	LifespanCompOpt,
	StateComp,
	Debug,
	KaboomPlugin,
	MergeObj,
	LevelComp,
	Edge,
	TileComp,
	TileCompOpt,
	LevelOpt,
	Cursor,
	Recording,
	BoomOpt,
	PeditFile,
	Shape,
	DoubleJumpComp,
	VirtualButton,
	TimerController,
	TweenController,
	LoadFontOpt,
	AgentComp,
	AgentCompOpt,
	PathFindOpt,
	GetOpt,
	Vec2Args,
	NineSlice,
	GamepadButton,
	GamepadStick,
	LerpValue,
	TexFilter,
} from "./types"

import FPSCounter from "./fps"
import Timer from "./timer"
import GAMEPAD_MAP from "./gamepad.json"

// @ts-ignore
import beanSpriteSrc from "./assets/bean.png"
// @ts-ignore
import burpSoundSrc from "./assets/burp.mp3"
// @ts-ignore
import kaSpriteSrc from "./assets/ka.png"
// @ts-ignore
import boomSpriteSrc from "./assets/boom.png"

type EventList<M> = {
	[event in keyof M]?: (event: M[event]) => void
}

interface SpriteCurAnim {
	name: string,
	timer: number,
	loop: boolean,
	speed: number,
	pingpong: boolean,
	onEnd: () => void,
}

// translate these key names to a simpler version
const KEY_ALIAS = {
	"ArrowLeft": "left",
	"ArrowRight": "right",
	"ArrowUp": "up",
	"ArrowDown": "down",
	" ": "space",
}

// don't trigger browser default event when these keys are pressed
const PREVENT_DEFAULT_KEYS = new Set([
	" ",
	"ArrowLeft",
	"ArrowRight",
	"ArrowUp",
	"ArrowDown",
	"Tab",
])

// according to https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
const MOUSE_BUTTONS: MouseButton[] = [
	"left",
	"middle",
	"right",
	"back",
	"forward",
]

// some default charsets for loading bitmap fonts
const ASCII_CHARS = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~"

const DEF_ANCHOR = "topleft"
const BG_GRID_SIZE = 64

const DEF_FONT = "monospace"
const DBG_FONT = "monospace"
const DEF_TEXT_SIZE = 36
const DEF_TEXT_CACHE_SIZE = 64
const MAX_TEXT_CACHE_SIZE = 256
const FONT_ATLAS_WIDTH = 2048
const FONT_ATLAS_HEIGHT = 2048
const SPRITE_ATLAS_WIDTH = 2048
const SPRITE_ATLAS_HEIGHT = 2048
// 0.1 pixel padding to texture coordinates to prevent artifact
const UV_PAD = 0.1
const DEF_HASH_GRID_SIZE = 64
const DEF_FONT_FILTER = "nearest"

const LOG_MAX = 1

const VERTEX_FORMAT = [
	{ name: "a_pos", size: 2 },
	{ name: "a_uv", size: 2 },
	{ name: "a_color", size: 4 },
]

const STRIDE = VERTEX_FORMAT.reduce((sum, f) => sum + f.size, 0)

const MAX_BATCHED_QUAD = 2048
const MAX_BATCHED_VERTS = MAX_BATCHED_QUAD * 4 * STRIDE
const MAX_BATCHED_INDICES = MAX_BATCHED_QUAD * 6

// vertex shader template, replace {{user}} with user vertex shader code
const VERT_TEMPLATE = `
attribute vec2 a_pos;
attribute vec2 a_uv;
attribute vec4 a_color;

varying vec2 v_pos;
varying vec2 v_uv;
varying vec4 v_color;

vec4 def_vert() {
	return vec4(a_pos, 0.0, 1.0);
}

{{user}}

void main() {
	vec4 pos = vert(a_pos, a_uv, a_color);
	v_pos = a_pos;
	v_uv = a_uv;
	v_color = a_color;
	gl_Position = pos;
}
`

// fragment shader template, replace {{user}} with user fragment shader code
const FRAG_TEMPLATE = `
precision mediump float;

varying vec2 v_pos;
varying vec2 v_uv;
varying vec4 v_color;

uniform sampler2D u_tex;

vec4 def_frag() {
	return v_color * texture2D(u_tex, v_uv);
}

{{user}}

void main() {
	gl_FragColor = frag(v_pos, v_uv, v_color, u_tex);
	if (gl_FragColor.a == 0.0) {
		discard;
	}
}
`

// default {{user}} vertex shader code
const DEF_VERT = `
vec4 vert(vec2 pos, vec2 uv, vec4 color) {
	return def_vert();
}
`

// default {{user}} fragment shader code
const DEF_FRAG = `
vec4 frag(vec2 pos, vec2 uv, vec4 color, sampler2D tex) {
	return def_frag();
}
`

const COMP_DESC = new Set([
	"id",
	"require",
])

const COMP_EVENTS = new Set([
	"add",
	"update",
	"draw",
	"destroy",
	"inspect",
	"drawInspect",
])

// wrappers around full screen functions to work across browsers
function enterFullscreen(el: HTMLElement) {
	if (el.requestFullscreen) el.requestFullscreen()
	// @ts-ignore
	else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
}

function exitFullscreen() {
	if (document.exitFullscreen) document.exitFullscreen()
	// @ts-ignore
	else if (document.webkitExitFullScreen) document.webkitExitFullScreen()
}

function getFullscreenElement(): Element | void {
	return document.fullscreenElement
		// @ts-ignore
		|| document.webkitFullscreenElement
}

// convert anchor string to a vec2 offset
function anchorPt(orig: Anchor | Vec2): Vec2 {
	switch (orig) {
		case "topleft": return new Vec2(-1, -1)
		case "top": return new Vec2(0, -1)
		case "topright": return new Vec2(1, -1)
		case "left": return new Vec2(-1, 0)
		case "center": return new Vec2(0, 0)
		case "right": return new Vec2(1, 0)
		case "botleft": return new Vec2(-1, 1)
		case "bot": return new Vec2(0, 1)
		case "botright": return new Vec2(1, 1)
		default: return orig
	}
}

function alignPt(align: TextAlign): number {
	switch (align) {
		case "left": return 0
		case "center": return 0.5
		case "right": return 1
		default: return 0
	}
}

function createEmptyAudioBuffer(ctx: AudioContext) {
	return ctx.createBuffer(1, 1, 44100)
}

class ButtonState<T = string> {
	pressed: Set<T> = new Set([])
	pressedRepeat: Set<T> = new Set([])
	released: Set<T> = new Set([])
	down: Set<T> = new Set([])
	update() {
		this.pressed.clear()
		this.released.clear()
		this.pressedRepeat.clear()
	}
	press(btn: T) {
		this.pressed.add(btn)
		this.pressedRepeat.add(btn)
		this.down.add(btn)
	}
	pressRepeat(btn: T) {
		this.pressedRepeat.add(btn)
	}
	release(btn: T) {
		this.down.delete(btn)
		this.pressed.delete(btn)
		this.released.add(btn)
	}
}

// only exports one kaboom() which contains all the state
export default (gopt: KaboomOpt = {}): KaboomCtx => {

	const gc: Array<() => void> = []

	const app = (() => {

		const root = gopt.root ?? document.body

		// if root is not defined (which falls back to <body>) we assume user is using kaboom on a clean page, and modify <body> to better fit a full screen canvas
		if (root === document.body) {
			document.body.style["width"] = "100%"
			document.body.style["height"] = "100%"
			document.body.style["margin"] = "0px"
			document.documentElement.style["width"] = "100%"
			document.documentElement.style["height"] = "100%"
		}

		// create a <canvas> if user didn't provide one
		const canvas = gopt.canvas ?? (() => {
			const canvas = document.createElement("canvas")
			root.appendChild(canvas)
			return canvas
		})()

		// global pixel scale
		const gscale = gopt.scale ?? 1
		const fixedSize = gopt.width && gopt.height && !gopt.stretch && !gopt.letterbox

		// adjust canvas size according to user size / viewport settings
		if (fixedSize) {
			canvas.width = gopt.width * gscale
			canvas.height = gopt.height * gscale
		} else {
			canvas.width = canvas.parentElement.offsetWidth
			canvas.height = canvas.parentElement.offsetHeight
		}

		const cw = canvas.width
		const ch = canvas.height
		const pixelDensity = gopt.pixelDensity || window.devicePixelRatio

		canvas.width *= pixelDensity
		canvas.height *= pixelDensity

		// canvas css styles
		const styles = [
			"outline: none",
			"cursor: default",
		]

		if (fixedSize) {
			styles.push(`width: ${cw}px`)
			styles.push(`height: ${ch}px`)
		} else {
			styles.push("width: 100%")
			styles.push("height: 100%")
		}

		if (gopt.crisp) {
			// chrome only supports pixelated and firefox only supports crisp-edges
			styles.push("image-rendering: pixelated")
			styles.push("image-rendering: crisp-edges")
		}

		canvas.style.cssText = styles.join(";")
		// make canvas focusable
		canvas.tabIndex = 0

		const fontCacheCanvas = document.createElement("canvas")
		fontCacheCanvas.width = MAX_TEXT_CACHE_SIZE
		fontCacheCanvas.height = MAX_TEXT_CACHE_SIZE
		const fontCacheCtx = fontCacheCanvas.getContext("2d", {
			willReadFrequently: true,
		})

		let lastWidth = canvas.offsetWidth
		let lastHeight = canvas.offsetHeight

		// TODO: don't resize framebuffer if fixedSize
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				if (entry.target !== canvas) continue
				if (lastWidth === canvas.offsetWidth && lastHeight === canvas.offsetHeight) return
				lastWidth = canvas.offsetWidth
				lastHeight = canvas.offsetHeight
				canvas.width = lastWidth * pixelDensity
				canvas.height = lastHeight * pixelDensity
				gfx.frameBuffer.free()
				gfx.frameBuffer = new FrameBuffer(gl.drawingBufferWidth, gl.drawingBufferHeight)
				updateViewport()
				game.ev.onOnce("frameEnd", () => {
					// should we also pass window / view size?
					game.ev.trigger("resize")
				})
			}
		})

		resizeObserver.observe(canvas)

		return {

			canvas: canvas,
			pixelDensity: pixelDensity,
			fontCacheCanvas: fontCacheCanvas,
			fontCacheCtx: fontCacheCtx,

			// keep track of all button states
			keyState: new ButtonState<Key>(),
			mouseState: new ButtonState<MouseButton>(),
			virtualButtonState: new ButtonState<VirtualButton>(),
			gamepadButtonState: new ButtonState<GamepadButton>(),

			// input states from last frame, should reset every frame
			charInputted: [],
			isMouseMoved: false,
			mouseStarted: false,
			mousePos: new Vec2(0, 0),
			mouseDeltaPos: new Vec2(0, 0),

			// total time elapsed
			time: 0,
			// real total time elapsed (including paused time)
			realTime: 0,
			// if we should skip next dt, to prevent the massive dt surge if user switch to another tab for a while and comeback
			skipTime: false,
			// how much time last frame took
			dt: 0.0,
			// total frames elapsed
			numFrames: 0,

			// if we're on a touch device
			isTouchScreen: ("ontouchstart" in window) || navigator.maxTouchPoints > 0,

			// requestAnimationFrame id
			loopID: null,
			// if our game loop is currently stopped / paused
			stopped: false,
			paused: false,

			fpsCounter: new FPSCounter(),

		}

	})()

	const gl = app.canvas
		.getContext("webgl", {
			antialias: true,
			depth: true,
			stencil: true,
			alpha: true,
			preserveDrawingBuffer: true,
		})

	class Texture {

		src: null | TexImageSource = null
		glTex: WebGLTexture
		width: number
		height: number

		constructor(w: number, h: number, opt: TextureOpt = {}) {

			this.glTex = gl.createTexture()
			gc.push(() => this.free())
			this.bind()

			if (w && h) {
				gl.texImage2D(
					gl.TEXTURE_2D,
					0, gl.RGBA,
					w,
					h,
					0,
					gl.RGBA,
					gl.UNSIGNED_BYTE,
					null,
				)
			}

			this.width = w
			this.height = h

			const filter = (() => {
				switch (opt.filter ?? gopt.texFilter) {
					case "linear": return gl.LINEAR
					case "nearest": return gl.NEAREST
					default: return gl.NEAREST
				}
			})()

			const wrap = (() => {
				switch (opt.wrap) {
					case "repeat": return gl.REPEAT
					case "clampToEdge": return gl.CLAMP_TO_EDGE
					default: return gl.CLAMP_TO_EDGE
				}
			})()

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap)
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap)
			this.unbind()

		}

		static fromImage(img: TexImageSource, opt: TextureOpt = {}): Texture {
			const tex = new Texture(0, 0, opt)
			tex.bind()
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
			tex.width = img.width
			tex.height = img.height
			tex.unbind()
			tex.src = img
			return tex
		}

		update(img: TexImageSource, x = 0, y = 0) {
			this.bind()
			gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, gl.RGBA, gl.UNSIGNED_BYTE, img)
			this.unbind()
		}

		bind() {
			gl.bindTexture(gl.TEXTURE_2D, this.glTex)
		}

		unbind() {
			gl.bindTexture(gl.TEXTURE_2D, null)
		}

		free() {
			gl.deleteTexture(this.glTex)
		}

	}

	class TexPacker {
		private tex: Texture
		private canvas: HTMLCanvasElement
		private ctx: CanvasRenderingContext2D
		private x: number = 0
		private y: number = 0
		private curHeight: number = 0
		constructor(w: number, h: number) {
			this.canvas = document.createElement("canvas")
			this.canvas.width = w
			this.canvas.height = h
			this.tex = Texture.fromImage(this.canvas)
			this.ctx = this.canvas.getContext("2d")
		}
		add(img: TexImageSource): [Texture, Quad] {
			if (img.width > this.canvas.width || img.height > this.canvas.height) {
				throw new Error(`Texture size (${img.width} x ${img.height}) exceeds limit (${this.canvas.width} x ${this.canvas.height})`)
			}
			if (this.x + img.width > this.canvas.width) {
				this.x = 0
				this.y += this.curHeight
				this.curHeight = 0
			}
			if (this.y + img.height > this.canvas.height) {
				this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
				this.tex = Texture.fromImage(this.canvas)
				this.x = 0
				this.y = 0
				this.curHeight = 0
			}
			const pos = new Vec2(this.x, this.y)
			this.x += img.width
			if (img.height > this.curHeight) {
				this.curHeight = img.height
			}
			if (img instanceof ImageData) {
				this.ctx.putImageData(img, pos.x, pos.y)
			} else {
				this.ctx.drawImage(img, pos.x, pos.y)
			}
			this.tex.update(this.canvas)
			return [this.tex, new Quad(
				pos.x / this.canvas.width,
				pos.y / this.canvas.height,
				img.width / this.canvas.width,
				img.height / this.canvas.height,
			)]
		}
	}

	class FrameBuffer {

		tex: Texture
		glFrameBuffer: WebGLFramebuffer
		glRenderBuffer: WebGLRenderbuffer

		constructor(w: number, h: number, opt: TextureOpt = {}) {
			this.tex = new Texture(w, h, opt)
			this.glFrameBuffer = gl.createFramebuffer()
			this.glRenderBuffer = gl.createRenderbuffer()
			gc.push(() => this.free())
			this.bind()
			gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, w, h)
			gl.framebufferTexture2D(
				gl.FRAMEBUFFER,
				gl.COLOR_ATTACHMENT0,
				gl.TEXTURE_2D,
				this.tex.glTex,
				0,
			)
			gl.framebufferRenderbuffer(
				gl.FRAMEBUFFER,
				gl.DEPTH_STENCIL_ATTACHMENT,
				gl.RENDERBUFFER,
				this.glRenderBuffer,
			)
			this.unbind()
		}

		bind() {
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.glFrameBuffer)
			gl.bindRenderbuffer(gl.RENDERBUFFER, this.glRenderBuffer)
			// gl.viewport(0, 0, this.tex.width, this.tex.height)
		}

		unbind() {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null)
			gl.bindRenderbuffer(gl.RENDERBUFFER, null)
		}

		free() {
			gl.deleteFramebuffer(this.glFrameBuffer)
			gl.deleteRenderbuffer(this.glRenderBuffer)
		}

	}

	const gfx = (() => {

		const defShader = makeShader(DEF_VERT, DEF_FRAG)

		// a 1x1 white texture to draw raw shapes like rectangles and polygons
		// we use a texture for those so we can use only 1 pipeline for drawing sprites + shapes
		const emptyTex = Texture.fromImage(
			new ImageData(new Uint8ClampedArray([ 255, 255, 255, 255 ]), 1, 1),
		)

		const frameBuffer = new FrameBuffer(gl.drawingBufferWidth, gl.drawingBufferHeight)
		let bgColor: null | Color = null
		let bgAlpha = 1

		if (gopt.background) {
			bgColor = Color.fromArray(gopt.background)
			bgAlpha = gopt.background[3] ?? 1
			gl.clearColor(
				bgColor.r / 255,
				bgColor.g / 255,
				bgColor.b / 255,
				bgAlpha,
			)
		}

		gl.enable(gl.BLEND)
		gl.enable(gl.SCISSOR_TEST)
		gl.blendFuncSeparate(
			gl.SRC_ALPHA,
			gl.ONE_MINUS_SRC_ALPHA,
			gl.ONE,
			gl.ONE_MINUS_SRC_ALPHA,
		)

		// we only use one vertex and index buffer that batches all draw calls
		const vbuf = gl.createBuffer()

		gl.bindBuffer(gl.ARRAY_BUFFER, vbuf)
		gl.bufferData(gl.ARRAY_BUFFER, MAX_BATCHED_VERTS * 4, gl.DYNAMIC_DRAW)

		VERTEX_FORMAT.reduce((offset, f, i) => {
			gl.vertexAttribPointer(i, f.size, gl.FLOAT, false, STRIDE * 4, offset)
			gl.enableVertexAttribArray(i)
			return offset + f.size * 4
		}, 0)

		gl.bindBuffer(gl.ARRAY_BUFFER, null)

		const ibuf = gl.createBuffer()

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf)
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, MAX_BATCHED_INDICES * 4, gl.DYNAMIC_DRAW)
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)

		// a checkerboard texture used for the default background
		const bgTex = Texture.fromImage(
			new ImageData(new Uint8ClampedArray([
				128, 128, 128, 255,
				190, 190, 190, 255,
				190, 190, 190, 255,
				128, 128, 128, 255,
			]), 2, 2), {
				wrap: "repeat",
				filter: "nearest",
			},
		)

		return {

			// keep track of how many draw calls we're doing this frame
			drawCalls: 0,
			// how many draw calls we're doing last frame, this is the number we give to users
			lastDrawCalls: 0,

			// gfx states
			defShader: defShader,
			curShader: defShader,
			frameBuffer: frameBuffer,
			postShader: null,
			postShaderUniform: null,
			defTex: emptyTex,
			curTex: emptyTex,
			curUniform: {},
			vbuf: vbuf,
			ibuf: ibuf,

			// local vertex / index buffer queue
			vqueue: [],
			iqueue: [],

			transform: new Mat4(),
			transformStack: [],

			bgTex: bgTex,
			bgColor: bgColor,
			bgAlpha: bgAlpha,

			width: gopt.width,
			height: gopt.height,

			viewport: {
				x: 0,
				y: 0,
				width: gl.drawingBufferWidth,
				height: gl.drawingBufferHeight,
			},

		}

	})()

	class SpriteData {

		tex: Texture
		frames: Quad[] = [ new Quad(0, 0, 1, 1) ]
		anims: SpriteAnims = {}
		slice9: NineSlice | null = null

		constructor(
			tex: Texture,
			frames?: Quad[],
			anims: SpriteAnims = {},
			slice9: NineSlice = null,
		) {
			this.tex = tex
			if (frames) this.frames = frames
			this.anims = anims
			this.slice9 = slice9
		}

		static from(src: LoadSpriteSrc, opt: LoadSpriteOpt = {}): Promise<SpriteData> {
			return typeof src === "string"
				? SpriteData.fromURL(src, opt)
				: Promise.resolve(SpriteData.fromImage(src, opt))
		}

		static fromImage(data: TexImageSource, opt: LoadSpriteOpt = {}): SpriteData {
			const [tex, quad] = assets.packer.add(data)
			const frames = opt.frames ? opt.frames.map((f) => new Quad(
				quad.x + f.x * quad.w,
				quad.y + f.y * quad.h,
				f.w * quad.w,
				f.h * quad.h,
			)) : slice(opt.sliceX || 1, opt.sliceY || 1, quad.x, quad.y, quad.w, quad.h)
			return new SpriteData(tex, frames, opt.anims, opt.slice9)
		}

		static fromURL(url: string, opt: LoadSpriteOpt = {}): Promise<SpriteData> {
			return loadImg(url).then((img) => SpriteData.fromImage(img, opt))
		}

	}

	class SoundData {

		buf: AudioBuffer

		constructor(buf: AudioBuffer) {
			this.buf = buf
		}

		static fromArrayBuffer(buf: ArrayBuffer): Promise<SoundData> {
			return new Promise((resolve, reject) =>
				audio.ctx.decodeAudioData(buf, resolve, reject),
			).then((buf: AudioBuffer) => new SoundData(buf))
		}

		static fromURL(url: string): Promise<SoundData> {
			if (isDataURL(url)) {
				return SoundData.fromArrayBuffer(dataURLToArrayBuffer(url))
			} else {
				return fetchArrayBuffer(url).then((buf) => SoundData.fromArrayBuffer(buf))
			}
		}

	}

	const audio = (() => {

		// TODO: handle when audio context is unavailable
		const ctx = new (
			window.AudioContext || (window as any).webkitAudioContext
		)() as AudioContext
		const masterNode = ctx.createGain()
		masterNode.connect(ctx.destination)

		// by default browsers can only load audio async, we don't deal with that and just start with an empty audio buffer
		const burpSnd = new SoundData(createEmptyAudioBuffer(ctx))

		// load that burp sound
		ctx.decodeAudioData(burpSoundSrc.buffer.slice(0)).then((buf) => {
			burpSnd.buf = buf
		}).catch((err) => {
			console.error("Failed to load burp: ", err)
		})

		return {
			ctx,
			masterNode,
			burpSnd,
		}

	})()

	class Asset<D> {
		loaded: boolean = false
		data: D | null = null
		error: Error | null = null
		private onLoadEvents: Event<[D]> = new Event()
		private onErrorEvents: Event<[Error]> = new Event()
		private onFinishEvents: Event<[]> = new Event()
		constructor(loader: Promise<D>) {
			loader.then((data) => {
				this.data = data
				this.onLoadEvents.trigger(data)
			}).catch((err) => {
				this.error = err
				if (this.onErrorEvents.numListeners() > 0) {
					this.onErrorEvents.trigger(err)
				} else {
					throw err
				}
			}).finally(() => {
				this.onFinishEvents.trigger()
				this.loaded = true
			})
		}
		static loaded<D>(data: D): Asset<D> {
			const asset = new Asset(Promise.resolve(data)) as Asset<D>
			asset.data = data
			asset.loaded = true
			return asset
		}
		onLoad(action: (data: D) => void) {
			this.onLoadEvents.add(action)
			return this
		}
		onError(action: (err: Error) => void) {
			this.onErrorEvents.add(action)
			return this
		}
		onFinish(action: () => void) {
			this.onFinishEvents.add(action)
			return this
		}
		then(action: (data: D) => void): Asset<D> {
			return this.onLoad(action)
		}
		catch(action: (err: Error) => void): Asset<D> {
			return this.onError(action)
		}
		finally(action: () => void): Asset<D> {
			return this.onFinish(action)
		}
	}

	class AssetBucket<D> {
		assets: Map<string, Asset<D>> = new Map()
		lastUID: number = 0
		add(name: string | null, loader: Promise<D>): Asset<D> {
			// if user don't provide a name we use a generated one
			const id = name ?? (this.lastUID++ + "")
			const asset = new Asset(loader)
			this.assets.set(id, asset)
			return asset
		}
		addLoaded(name: string | null, data: D): Asset<D> {
			const id = name ?? (this.lastUID++ + "")
			const asset = Asset.loaded(data)
			this.assets.set(id, asset)
			return asset
		}
		get(handle: string): Asset<D> | void {
			return this.assets.get(handle)
		}
		progress(): number {
			if (this.assets.size === 0) {
				return 1
			}
			let loaded = 0
			this.assets.forEach((asset) => {
				if (asset.loaded) {
					loaded++
				}
			})
			return loaded / this.assets.size
		}
	}

	const assets = {
		// prefix for when loading from a url
		urlPrefix: "",
		// asset holders
		sprites: new AssetBucket<SpriteData>(),
		fonts: new AssetBucket<FontData>(),
		bitmapFonts: new AssetBucket<BitmapFontData>(),
		sounds: new AssetBucket<SoundData>(),
		shaders: new AssetBucket<ShaderData>(),
		custom: new AssetBucket<any>(),
		packer: new TexPacker(SPRITE_ATLAS_WIDTH, SPRITE_ATLAS_HEIGHT),
		// if we finished initially loading all assets
		loaded: false,
	}

	const game = {

		// general events
		ev: new EventHandler<{
			mouseMove: [],
			mouseDown: [MouseButton],
			mousePress: [MouseButton],
			mouseRelease: [MouseButton],
			charInput: [string],
			keyPress: [Key],
			keyDown: [Key],
			keyPressRepeat: [Key],
			keyRelease: [Key],
			touchStart: [Vec2, Touch],
			touchMove: [Vec2, Touch],
			touchEnd: [Vec2, Touch],
			virtualButtonDown: [VirtualButton],
			virtualButtonPress: [VirtualButton],
			virtualButtonRelease: [VirtualButton],
			gamepadButtonDown: [string],
			gamepadButtonPress: [string],
			gamepadButtonRelease: [string],
			gamepadStick: [string, Vec2],
			gamepadConnect: [Gamepad],
			gamepadDisconnect: [Gamepad],
			scroll: [Vec2],
			add: [GameObj],
			destroy: [GameObj],
			load: [],
			loading: [number],
			error: [Error],
			input: [],
			frameEnd: [],
			resize: [],
		}>(),

		// object events
		objEvents: new EventHandler(),

		// root game object
		root: make([]),

		// misc
		gravity: 0,
		scenes: {},

		// on screen log
		logs: [],

		// camera
		cam: {
			pos: null,
			scale: new Vec2(1),
			angle: 0,
			shake: 0,
			transform: new Mat4(),
		},

	}

	// TODO: accept Asset<T>?
	// wrap individual loaders with global loader counter, for stuff like progress bar
	function load<T>(prom: Promise<T>): Asset<T> {
		return assets.custom.add(null, prom)
	}

	// get current load progress
	function loadProgress(): number {
		const buckets = [
			assets.sprites,
			assets.sounds,
			assets.shaders,
			assets.fonts,
			assets.bitmapFonts,
			assets.custom,
		]
		return buckets.reduce((n, bucket) => n + bucket.progress(), 0) / buckets.length
	}

	// global load path prefix
	function loadRoot(path?: string): string {
		if (path !== undefined) {
			assets.urlPrefix = path
		}
		return assets.urlPrefix
	}

	// wrapper around fetch() that applies urlPrefix and basic error handling
	function fetchURL(path: string) {
		const url = assets.urlPrefix + path
		return fetch(url)
			.then((res) => {
				if (!res.ok) throw new Error(`Failed to fetch ${url}`)
				return res
			})
	}

	function fetchJSON(path: string) {
		return fetchURL(path).then((res) => res.json())
	}

	function fetchText(path: string) {
		return fetchURL(path).then((res) => res.text())
	}

	function fetchArrayBuffer(path: string) {
		return fetchURL(path).then((res) => res.arrayBuffer())
	}

	// wrapper around image loader to get a Promise
	function loadImg(src: string): Promise<HTMLImageElement> {
		const img = new Image()
		img.crossOrigin = "anonymous"
		img.src = isDataURL(src) ? src : assets.urlPrefix + src
		return new Promise<HTMLImageElement>((resolve, reject) => {
			img.onload = () => resolve(img)
			img.onerror = () => reject(new Error(`Failed to load image from "${src}"`))
		})
	}

	class FontData {
		fontface: FontFace
		outline: number
		filter: TexFilter
		constructor(face: FontFace, opt: LoadFontOpt = {}) {
			this.fontface = face
			this.outline = opt.outline ?? 0
			this.filter = opt.filter ?? DEF_FONT_FILTER
		}
	}

	// TODO: pass in null src to store opt for default fonts like "monospace"
	function loadFont(
		name: string,
		src: string | ArrayBuffer,
		opt: LoadFontOpt = {},
	): Asset<FontData> {
		const font = new FontFace(name, typeof src === "string" ? `url(${src})` : src)
		document.fonts.add(font)
		return assets.fonts.add(name, font.load().catch((err) => {
			throw new Error(`Failed to load font from "${src}": ${err}`)
		}).then((face) => new FontData(face, opt)))
	}

	// TODO: support outline
	// TODO: support LoadSpriteSrc
	function loadBitmapFont(
		name: string | null,
		src: string,
		gw: number,
		gh: number,
		opt: LoadBitmapFontOpt = {},
	): Asset<BitmapFontData> {
		return assets.bitmapFonts.add(name, loadImg(src)
			.then((img) => {
				return makeFont(
					Texture.fromImage(img, opt),
					gw,
					gh,
					opt.chars ?? ASCII_CHARS,
				)
			}),
		)
	}

	// get an array of frames based on configuration on how to slice the image
	function slice(x = 1, y = 1, dx = 0, dy = 0, w = 1, h = 1): Quad[] {
		const frames = []
		const qw = w / x
		const qh = h / y
		for (let j = 0; j < y; j++) {
			for (let i = 0; i < x; i++) {
				frames.push(new Quad(
					dx + i * qw,
					dy + j * qh,
					qw,
					qh,
				))
			}
		}
		return frames
	}

	// TODO: load synchronously if passed TexImageSource
	function loadSpriteAtlas(
		src: LoadSpriteSrc,
		data: SpriteAtlasData | string,
	): Asset<Record<string, SpriteData>> {
		if (typeof data === "string") {
			return load(new Promise((res, rej) => {
				fetchJSON(data).then((data2) => {
					loadSpriteAtlas(src, data2).then(res).catch(rej)
				})
			}))
		}
		return load(SpriteData.from(src).then((atlas) => {
			const map = {}
			for (const name in data) {
				const info = data[name]
				const quad = atlas.frames[0]
				const w = SPRITE_ATLAS_WIDTH * quad.w
				const h = SPRITE_ATLAS_HEIGHT * quad.h
				const frames = info.frames ? info.frames.map((f) => new Quad(
					quad.x + (info.x + f.x) / w * quad.w,
					quad.y + (info.y + f.y) / h * quad.h,
					f.w / w * quad.w,
					f.h / h * quad.h,
				)) : slice(
					info.sliceX || 1,
					info.sliceY || 1,
					quad.x + info.x / w * quad.w,
					quad.y + info.y / h * quad.h,
					info.width / w * quad.w,
					info.height / h * quad.h,
				)
				const spr = new SpriteData(atlas.tex, frames, info.anims)
				assets.sprites.addLoaded(name, spr)
				map[name] = spr
			}
			return map
		}))
	}

	function createSpriteSheet(
		images: TexImageSource[],
		opt: LoadSpriteOpt = {},
	): SpriteData {
		const canvas = document.createElement("canvas")
		const width = images[0].width
		const height = images[0].height
		canvas.width = width * images.length
		canvas.height = height
		const ctx = canvas.getContext("2d")
		images.forEach((img, i) => {
			if (img instanceof ImageData) {
				ctx.putImageData(img, i * width, 0)
			} else {
				ctx.drawImage(img, i * width, 0)
			}
		})
		const merged = ctx.getImageData(0, 0, images.length * width, height)
		return SpriteData.fromImage(merged, {
			...opt,
			sliceX: images.length,
			sliceY: 1,
		})
	}

	// load a sprite to asset manager
	function loadSprite(
		name: string | null,
		src: LoadSpriteSrc | LoadSpriteSrc[],
		opt: LoadSpriteOpt = {
			sliceX: 1,
			sliceY: 1,
			anims: {},
		},
	): Asset<SpriteData> {
		if (Array.isArray(src)) {
			if (src.some((s) => typeof s === "string")) {
				return assets.sprites.add(
					name,
					Promise.all(src.map((s) => {
						return typeof s === "string" ? loadImg(s) : Promise.resolve(s)
					})).then((images) => createSpriteSheet(images, opt)),
				)
			} else {
				return assets.sprites.addLoaded(name, createSpriteSheet(src as TexImageSource[], opt))
			}
		} else {
			if (typeof src === "string") {
				return assets.sprites.add(name, SpriteData.from(src, opt))
			} else {
				return assets.sprites.addLoaded(name, SpriteData.fromImage(src, opt))
			}
		}
	}

	function loadPedit(name: string | null, src: string | PeditFile): Asset<SpriteData> {

		// eslint-disable-next-line
		return assets.sprites.add(name, new Promise(async (resolve) => {

			const data = typeof src === "string" ? await fetchJSON(src) : src
			const images = await Promise.all(data.frames.map(loadImg))
			const canvas = document.createElement("canvas")
			canvas.width = data.width
			canvas.height = data.height * data.frames.length

			const ctx = canvas.getContext("2d")

			images.forEach((img: HTMLImageElement, i) => {
				ctx.drawImage(img, 0, i * data.height)
			})

			const spr = await loadSprite(null, canvas, {
				sliceY: data.frames.length,
				anims: data.anims,
			})

			resolve(spr)

		}))

	}

	function loadAseprite(
		name: string | null,
		imgSrc: LoadSpriteSrc,
		jsonSrc: string,
	): Asset<SpriteData> {
		if (typeof imgSrc === "string" && !jsonSrc) {
			jsonSrc = imgSrc.replace(new RegExp(`${getExt(imgSrc)}$`), "json")
		}
		const resolveJSON = typeof jsonSrc === "string"
			? fetchJSON(jsonSrc)
			: Promise.resolve(jsonSrc)
		return assets.sprites.add(name, resolveJSON.then((data) => {
			const size = data.meta.size
			const frames = data.frames.map((f: any) => {
				return new Quad(
					f.frame.x / size.w,
					f.frame.y / size.h,
					f.frame.w / size.w,
					f.frame.h / size.h,
				)
			})
			const anims = {}
			for (const anim of data.meta.frameTags) {
				if (anim.from === anim.to) {
					anims[anim.name] = anim.from
				} else {
					anims[anim.name] = {
						from: anim.from,
						to: anim.to,
						speed: 10,
						loop: true,
						pingpong: anim.direction === "pingpong",
					}
				}
			}
			return SpriteData.from(imgSrc, {
				frames: frames,
				anims: anims,
			})
		}))
	}

	function loadShader(
		name: string | null,
		vert?: string,
		frag?: string,
	) {
		return assets.shaders.addLoaded(name, makeShader(vert, frag))
	}

	function loadShaderURL(
		name: string | null,
		vert?: string,
		frag?: string,
	): Asset<ShaderData> {
		const resolveUrl = (url?: string) =>
			url
				? fetchText(url)
				: Promise.resolve(null)
		const load = Promise.all([resolveUrl(vert), resolveUrl(frag)])
			.then(([vcode, fcode]: [string | null, string | null]) => {
				return makeShader(vcode, fcode)
			})
		return assets.shaders.add(name, load)
	}

	// TODO: allow stream big audio
	// load a sound to asset manager
	function loadSound(
		name: string | null,
		src: string | ArrayBuffer,
	): Asset<SoundData> {
		return assets.sounds.add(
			name,
			typeof src === "string"
				? SoundData.fromURL(src)
				: SoundData.fromArrayBuffer(src),
		)
	}

	function loadBean(name: string = "bean"): Asset<SpriteData> {
		return loadSprite(name, beanSpriteSrc)
	}

	function getSprite(handle: string): Asset<SpriteData> | void {
		return assets.sprites.get(handle)
	}

	function getSound(handle: string): Asset<SoundData> | void {
		return assets.sounds.get(handle)
	}

	function getFont(handle: string): Asset<FontData> | void {
		return assets.fonts.get(handle)
	}

	function getBitmapFont(handle: string): Asset<BitmapFontData> | void {
		return assets.bitmapFonts.get(handle)
	}

	function getShader(handle: string): Asset<ShaderData> | void {
		return assets.shaders.get(handle)
	}

	function resolveSprite(
		src: DrawSpriteOpt["sprite"],
	): Asset<SpriteData> | null {
		if (typeof src === "string") {
			const spr = getSprite(src)
			if (spr) {
				// if it's already loaded or being loading, return it
				return spr
			} else if (loadProgress() < 1) {
				// if there's any other ongoing loading task we return empty and don't error yet
				return null
			} else {
				// if all other assets are loaded and we still haven't found this sprite, throw
				throw new Error(`Sprite not found: ${src}`)
			}
		} else if (src instanceof SpriteData) {
			return Asset.loaded(src)
		} else if (src instanceof Asset) {
			return src
		} else {
			throw new Error(`Invalid sprite: ${src}`)
		}
	}

	function resolveSound(
		src: Parameters<typeof play>[0],
	): SoundData | Asset<SoundData> | null {
		if (typeof src === "string") {
			const snd = getSound(src)
			if (snd) {
				return snd.data ?? snd
			} else if (loadProgress() < 1) {
				return null
			} else {
				throw new Error(`Sound not found: ${src}`)
			}
		} else if (src instanceof SoundData) {
			return src
		} else if (src instanceof Asset) {
			return src.data ? src.data : src
		} else {
			throw new Error(`Invalid sound: ${src}`)
		}
	}

	function resolveShader(
		src: RenderProps["shader"],
	): ShaderData | Asset<ShaderData> | null {
		if (!src) {
			return gfx.defShader
		}
		if (typeof src === "string") {
			const shader = getShader(src)
			if (shader) {
				return shader.data ?? shader
			} else if (loadProgress() < 1) {
				return null
			} else {
				throw new Error(`Shader not found: ${src}`)
			}
		} else if (src instanceof Asset) {
			return src.data ? src.data : src
		}
		// TODO: check type
		// @ts-ignore
		return src
	}

	function resolveFont(
		src: DrawTextOpt["font"],
	):
		| FontData
		| Asset<FontData>
		| BitmapFontData
		| Asset<BitmapFontData>
		| string
		| void
	{
		if (!src) {
			return resolveFont(gopt.font ?? DEF_FONT)
		}
		if (typeof src === "string") {
			const bfont = getBitmapFont(src)
			const font = getFont(src)
			if (bfont) {
				return bfont.data ?? bfont
			} else if (font) {
				return font.data ?? font
			} else if (document.fonts.check(`${DEF_TEXT_CACHE_SIZE}px ${src}`)) {
				return src
			} else if (loadProgress() < 1) {
				return null
			} else {
				throw new Error(`Font not found: ${src}`)
			}
		} else if (src instanceof Asset) {
			return src.data ? src.data : src
		}
		// TODO: check type
		// @ts-ignore
		return src
	}

	// get / set master volume
	function volume(v?: number): number {
		if (v !== undefined) {
			audio.masterNode.gain.value = v
		}
		return audio.masterNode.gain.value
	}

	// TODO: time() not correct when looped over or ended
	// TODO: onEnd() not working
	// plays a sound, returns a control handle
	function play(
		src: string | SoundData | Asset<SoundData>,
		opt: AudioPlayOpt = {},
	): AudioPlay {

		const snd = resolveSound(src)
		const ctx = audio.ctx
		let paused = opt.paused ?? false
		let srcNode = ctx.createBufferSource()
		const onEndEvents = new Event()
		const gainNode = ctx.createGain()
		const pos = opt.seek ?? 0
		let startTime = 0
		let stopTime = 0
		let started = false

		srcNode.loop = Boolean(opt.loop)
		srcNode.detune.value = opt.detune ?? 0
		srcNode.playbackRate.value = opt.speed ?? 1
		srcNode.connect(gainNode)
		srcNode.onended = () => {
			if (getTime() >= srcNode.buffer?.duration ?? Number.POSITIVE_INFINITY) {
				onEndEvents.trigger()
			}
		}
		gainNode.connect(audio.masterNode)
		gainNode.gain.value = opt.volume ?? 1

		const start = (data: SoundData) => {
			srcNode.buffer = data.buf
			if (!paused) {
				startTime = ctx.currentTime
				srcNode.start(0, pos)
				started = true
			}
		}

		if (snd instanceof Asset) {
			snd.onLoad(start)
		} else if (snd instanceof SoundData) {
			start(snd)
		}

		const getTime = () => {
			if (!srcNode.buffer) return 0
			const t = paused
				? stopTime - startTime
				: ctx.currentTime - startTime
			const d = srcNode.buffer.duration
			return srcNode.loop ? t % d : Math.min(t, d)
		}

		const cloneNode = (oldNode: AudioBufferSourceNode) => {
			const newNode = ctx.createBufferSource()
			newNode.buffer = oldNode.buffer
			newNode.loop = oldNode.loop
			newNode.playbackRate.value = oldNode.playbackRate.value
			newNode.detune.value = oldNode.detune.value
			newNode.onended = oldNode.onended
			newNode.connect(gainNode)
			return newNode
		}

		return {

			set paused(p: boolean) {
				if (paused === p) return
				paused = p
				if (p) {
					if (started) {
						srcNode.stop()
						started = false
					}
					stopTime = ctx.currentTime
				} else {
					srcNode = cloneNode(srcNode)
					const pos = stopTime - startTime
					srcNode.start(0, pos)
					started = true
					startTime = ctx.currentTime - pos
					stopTime = 0
				}
			},

			get paused() {
				return paused
			},

			play(time: number = 0) {
				this.seek(time)
				this.paused = false
			},

			seek(time: number) {
				if (!srcNode.buffer?.duration) return
				if (time > srcNode.buffer.duration) return
				if (paused) {
					srcNode = cloneNode(srcNode)
					startTime = stopTime - time
				} else {
					srcNode.stop()
					srcNode = cloneNode(srcNode)
					startTime = ctx.currentTime - time
					srcNode.start(0, time)
					started = true
					stopTime = 0
				}
			},

			// TODO: affect time()
			set speed(val: number) {
				srcNode.playbackRate.value = val
			},

			get speed() {
				return srcNode.playbackRate.value
			},

			set detune(val: number) {
				srcNode.detune.value = val
			},

			get detune() {
				return srcNode.detune.value
			},

			set volume(val: number) {
				gainNode.gain.value = val
			},

			get volume() {
				return gainNode.gain.value
			},

			set loop(l: boolean) {
				srcNode.loop = l
			},

			get loop() {
				return srcNode.loop
			},

			duration(): number {
				return srcNode.buffer?.duration ?? 0
			},

			time(): number {
				return getTime() % this.duration()
			},

			onEnd(action: () => void) {
				return onEndEvents.add(action)
			},

			then(action: () => void) {
				return this.onEnd(action)
			},

		}

	}

	// core kaboom logic
	function burp(opt?: AudioPlayOpt): AudioPlay {
		return play(audio.burpSnd, opt)
	}

	type DrawTextureOpt = RenderProps & {
		tex: Texture,
		width?: number,
		height?: number,
		tiled?: boolean,
		flipX?: boolean,
		flipY?: boolean,
		quad?: Quad,
		anchor?: Anchor | Vec2,
	}

	function makeShader(
		vertSrc: string | null = DEF_VERT,
		fragSrc: string | null = DEF_FRAG,
	): GfxShader {

		const vcode = VERT_TEMPLATE.replace("{{user}}", vertSrc ?? DEF_VERT)
		const fcode = FRAG_TEMPLATE.replace("{{user}}", fragSrc ?? DEF_FRAG)
		const vertShader = gl.createShader(gl.VERTEX_SHADER)
		const fragShader = gl.createShader(gl.FRAGMENT_SHADER)

		gl.shaderSource(vertShader, vcode)
		gl.shaderSource(fragShader, fcode)
		gl.compileShader(vertShader)
		gl.compileShader(fragShader)

		const prog = gl.createProgram()

		gc.push(() => gl.deleteProgram(prog))
		gl.attachShader(prog, vertShader)
		gl.attachShader(prog, fragShader)

		gl.bindAttribLocation(prog, 0, "a_pos")
		gl.bindAttribLocation(prog, 1, "a_uv")
		gl.bindAttribLocation(prog, 2, "a_color")

		gl.linkProgram(prog)

		if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {

			const formatShaderError = (msg: string) => {
				const FMT = /^ERROR:\s0:(?<line>\d+):\s(?<msg>.+)/
				const match = msg.match(FMT)
				return {
					line: Number(match.groups.line),
					// seem to be a \n\0 at the end of error messages, causing unwanted line break
					msg: match.groups.msg.replace(/\n\0$/, ""),
				}
			}

			const vertError = gl.getShaderInfoLog(vertShader)
			const fragError = gl.getShaderInfoLog(fragShader)
			let msg = ""

			if (vertError) {
				const err = formatShaderError(vertError)
				msg += `Vertex shader line ${err.line - 14}: ${err.msg}`
			}

			if (fragError) {
				const err = formatShaderError(fragError)
				msg += `Fragment shader line ${err.line - 14}: ${err.msg}`
			}

			throw new Error(msg)

		}

		gl.deleteShader(vertShader)
		gl.deleteShader(fragShader)

		return {

			bind() {
				gl.useProgram(prog)
			},

			unbind() {
				gl.useProgram(null)
			},

			free() {
				gl.deleteProgram(prog)
			},

			// TODO: support vec3 and vec4
			send(uniform: Uniform) {
				for (const name in uniform) {
					const val = uniform[name]
					const loc = gl.getUniformLocation(prog, name)
					if (typeof val === "number") {
						gl.uniform1f(loc, val)
					} else if (val instanceof Mat4) {
						gl.uniformMatrix4fv(loc, false, new Float32Array(val.m))
					} else if (val instanceof Color) {
						// TODO: opacity?
						gl.uniform3f(loc, val.r, val.g, val.b)
					} else if (val instanceof Vec2) {
						gl.uniform2f(loc, val.x, val.y)
					}
				}
			},

		}

	}

	function makeFont(
		tex: Texture,
		gw: number,
		gh: number,
		chars: string,
	): GfxFont {

		const cols = tex.width / gw
		const map: Record<string, Quad> = {}
		const charMap = chars.split("").entries()

		for (const [i, ch] of charMap) {
			map[ch] = new Quad(
				(i % cols) * gw,
				Math.floor(i / cols) * gh,
				gw,
				gh,
			)
		}

		return {
			tex: tex,
			map: map,
			size: gh,
		}

	}

	// TODO: expose
	function drawRaw(
		verts: Vertex[],
		indices: number[],
		fixed: boolean,
		tex: Texture = gfx.defTex,
		shaderSrc: RenderProps["shader"] = gfx.defShader,
		uniform: Uniform = {},
	) {

		const shader = resolveShader(shaderSrc)

		if (!shader || shader instanceof Asset) {
			return
		}

		// flush on texture / shader change and overflow
		if (
			tex !== gfx.curTex
			|| shader !== gfx.curShader
			|| !deepEq(gfx.curUniform, uniform)
			|| gfx.vqueue.length + verts.length * STRIDE > MAX_BATCHED_VERTS
			|| gfx.iqueue.length + indices.length > MAX_BATCHED_INDICES
		) {
			flush()
		}

		const transform = fixed ? gfx.transform : game.cam.transform.mult(gfx.transform)

		for (const v of verts) {
			// normalized world space coordinate [-1.0 ~ 1.0]
			const pt = screen2ndc(transform.multVec2(v.pos))
			gfx.vqueue.push(
				pt.x, pt.y,
				v.uv.x, v.uv.y,
				v.color.r / 255, v.color.g / 255, v.color.b / 255, v.opacity,
			)
		}

		for (const i of indices) {
			gfx.iqueue.push(i + gfx.vqueue.length / STRIDE - verts.length)
		}

		gfx.curTex = tex
		gfx.curShader = shader
		gfx.curUniform = uniform

	}

	// draw all batched shapes
	function flush() {

		if (
			!gfx.curTex
			|| !gfx.curShader
			|| gfx.vqueue.length === 0
			|| gfx.iqueue.length === 0
		) {
			return
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, gfx.vbuf)
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(gfx.vqueue))
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gfx.ibuf)
		gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, new Uint16Array(gfx.iqueue))
		gfx.curShader.bind()
		gfx.curShader.send(gfx.curUniform)
		gfx.curTex.bind()
		gl.drawElements(gl.TRIANGLES, gfx.iqueue.length, gl.UNSIGNED_SHORT, 0)
		gfx.curTex.unbind()
		gfx.curShader.unbind()
		gl.bindBuffer(gl.ARRAY_BUFFER, null)
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)

		gfx.vqueue.length = 0
		gfx.iqueue.length = 0

		gfx.drawCalls++

	}

	// start a rendering frame, reset some states
	function frameStart() {

		// clear backbuffer
		gl.clear(gl.COLOR_BUFFER_BIT)
		gfx.frameBuffer.bind()
		// clear framebuffer
		gl.clear(gl.COLOR_BUFFER_BIT)

		if (!gfx.bgColor) {
			drawUnscaled(() => {
				drawUVQuad({
					width: width(),
					height: height(),
					quad: new Quad(
						0,
						0,
						width() / BG_GRID_SIZE,
						height() / BG_GRID_SIZE,
					),
					tex: gfx.bgTex,
					fixed: true,
				})
			})
		}

		gfx.drawCalls = 0
		gfx.transformStack.length = 0
		gfx.transform = new Mat4()

	}

	function usePostEffect(name: string, uniform?: Uniform | (() => Uniform)) {
		gfx.postShader = name
		gfx.postShaderUniform = uniform ?? null
	}

	function frameEnd() {
		// TODO: don't render debug UI with framebuffer
		// TODO: polish framebuffer rendering / sizing issues
		flush()
		gfx.frameBuffer.unbind()
		drawUnscaled(() => {
			drawTexture({
				flipY: true,
				tex: gfx.frameBuffer.tex,
				scale: new Vec2(1 / app.pixelDensity),
				shader: gfx.postShader,
				uniform: typeof gfx.postShaderUniform === "function"
					? gfx.postShaderUniform()
					: gfx.postShaderUniform,
				fixed: true,
			})
		})
		flush()
		gfx.lastDrawCalls = gfx.drawCalls
	}

	// convert a screen space coordinate to webgl normalized device coordinate
	function screen2ndc(pt: Vec2): Vec2 {
		return new Vec2(
			pt.x / width() * 2 - 1,
			-pt.y / height() * 2 + 1,
		)
	}

	function pushMatrix(m: Mat4) {
		gfx.transform = m.clone()
	}

	function pushTranslate(...args: Vec2Args) {
		if (args[0] === undefined) return
		const p = vec2(...args)
		if (p.x === 0 && p.y === 0) return
		gfx.transform.translate(p)
	}

	function pushScale(...args: Vec2Args) {
		if (args[0] === undefined) return
		const p = vec2(...args)
		if (p.x === 1 && p.y === 1) return
		gfx.transform.scale(p)
	}

	function pushRotate(a: number) {
		if (!a) return
		gfx.transform.rotate(a)
	}

	function pushTransform() {
		gfx.transformStack.push(gfx.transform.clone())
	}

	function popTransform() {
		if (gfx.transformStack.length > 0) {
			gfx.transform = gfx.transformStack.pop()
		}
	}

	// draw a uv textured quad
	function drawUVQuad(opt: DrawUVQuadOpt) {

		if (opt.width === undefined || opt.height === undefined) {
			throw new Error("drawUVQuad() requires property \"width\" and \"height\".")
		}

		if (opt.width <= 0 || opt.height <= 0) {
			return
		}

		const w = opt.width
		const h = opt.height
		const anchor = anchorPt(opt.anchor || DEF_ANCHOR)
		const offset = anchor.scale(new Vec2(w, h).scale(-0.5))
		const q = opt.quad || new Quad(0, 0, 1, 1)
		const color = opt.color || rgb(255, 255, 255)
		const opacity = opt.opacity ?? 1

		// apply uv padding to avoid artifacts
		const uvPadX = opt.tex ? UV_PAD / opt.tex.width : 0
		const uvPadY = opt.tex ? UV_PAD / opt.tex.height : 0
		const qx = q.x + uvPadX
		const qy = q.y + uvPadY
		const qw = q.w - uvPadX * 2
		const qh = q.h - uvPadY * 2

		pushTransform()
		pushTranslate(opt.pos)
		pushRotate(opt.angle)
		pushScale(opt.scale)
		pushTranslate(offset)

		drawRaw([
			{
				pos: new Vec2(-w / 2, h / 2),
				uv: new Vec2(opt.flipX ? qx + qw : qx, opt.flipY ? qy : qy + qh),
				color: color,
				opacity: opacity,
			},
			{
				pos: new Vec2(-w / 2, -h / 2),
				uv: new Vec2(opt.flipX ? qx + qw : qx, opt.flipY ? qy + qh : qy),
				color: color,
				opacity: opacity,
			},
			{
				pos: new Vec2(w / 2, -h / 2),
				uv: new Vec2(opt.flipX ? qx : qx + qw, opt.flipY ? qy + qh : qy),
				color: color,
				opacity: opacity,
			},
			{
				pos: new Vec2(w / 2, h / 2),
				uv: new Vec2(opt.flipX ? qx : qx + qw, opt.flipY ? qy : qy + qh),
				color: color,
				opacity: opacity,
			},
		], [0, 1, 3, 1, 2, 3], opt.fixed, opt.tex, opt.shader, opt.uniform)

		popTransform()

	}

	// TODO: clean
	function drawTexture(opt: DrawTextureOpt) {

		if (!opt.tex) {
			throw new Error("drawTexture() requires property \"tex\".")
		}

		const q = opt.quad ?? new Quad(0, 0, 1, 1)
		const w = opt.tex.width * q.w
		const h = opt.tex.height * q.h
		const scale = new Vec2(1)

		if (opt.tiled) {

			// TODO: draw fract
			const repX = Math.ceil((opt.width || w) / w)
			const repY = Math.ceil((opt.height || h) / h)
			const anchor = anchorPt(opt.anchor || DEF_ANCHOR).add(new Vec2(1, 1)).scale(0.5)
			const offset = anchor.scale(repX * w, repY * h)

			// TODO: rotation
			for (let i = 0; i < repX; i++) {
				for (let j = 0; j < repY; j++) {
					drawUVQuad(Object.assign(opt, {
						pos: (opt.pos || new Vec2(0)).add(new Vec2(w * i, h * j)).sub(offset),
						scale: scale.scale(opt.scale || new Vec2(1)),
						tex: opt.tex,
						quad: q,
						width: w,
						height: h,
						anchor: "topleft",
					}))
				}
			}
		} else {

			// TODO: should this ignore scale?
			if (opt.width && opt.height) {
				scale.x = opt.width / w
				scale.y = opt.height / h
			} else if (opt.width) {
				scale.x = opt.width / w
				scale.y = scale.x
			} else if (opt.height) {
				scale.y = opt.height / h
				scale.x = scale.y
			}

			drawUVQuad(Object.assign(opt, {
				scale: scale.scale(opt.scale || new Vec2(1)),
				tex: opt.tex,
				quad: q,
				width: w,
				height: h,
			}))

		}

	}

	function drawSprite(opt: DrawSpriteOpt) {

		if (!opt.sprite) {
			throw new Error("drawSprite() requires property \"sprite\"")
		}

		// TODO: slow
		const spr = resolveSprite(opt.sprite)

		if (!spr || !spr.data) {
			return
		}

		const q = spr.data.frames[opt.frame ?? 0]

		if (!q) {
			throw new Error(`Frame not found: ${opt.frame ?? 0}`)
		}

		drawTexture(Object.assign(opt, {
			tex: spr.data.tex,
			quad: q.scale(opt.quad ?? new Quad(0, 0, 1, 1)),
		}))

	}

	// generate vertices to form an arc
	function getArcPts(
		pos: Vec2,
		radiusX: number,
		radiusY: number,
		start: number,
		end: number,
		res: number = 1,
	): Vec2[] {

		// normalize and turn start and end angles to radians
		start = deg2rad(start % 360)
		end = deg2rad(end % 360)
		if (end <= start) end += Math.PI * 2

		const pts = []
		const nverts = Math.ceil((end - start) / deg2rad(8) * res)
		const step = (end - start) / nverts

		// calculate vertices
		for (let a = start; a < end; a += step) {
			pts.push(pos.add(radiusX * Math.cos(a), radiusY * Math.sin(a)))
		}

		pts.push(pos.add(radiusX * Math.cos(end), radiusY * Math.sin(end)))

		return pts

	}

	function drawRect(opt: DrawRectOpt) {

		if (opt.width === undefined || opt.height === undefined) {
			throw new Error("drawRect() requires property \"width\" and \"height\".")
		}

		if (opt.width <= 0 || opt.height <= 0) {
			return
		}

		const w = opt.width
		const h = opt.height
		const anchor = anchorPt(opt.anchor || DEF_ANCHOR).add(1, 1)
		const offset = anchor.scale(new Vec2(w, h).scale(-0.5))

		let pts = [
			new Vec2(0, 0),
			new Vec2(w, 0),
			new Vec2(w, h),
			new Vec2(0, h),
		]

		// TODO: gradient for rounded rect
		// TODO: drawPolygon should handle generic rounded corners
		if (opt.radius) {

			// maxium radius is half the shortest side
			const r = Math.min(Math.min(w, h) / 2, opt.radius)

			pts = [
				new Vec2(r, 0),
				new Vec2(w - r, 0),
				...getArcPts(new Vec2(w - r, r), r, r, 270, 360),
				new Vec2(w, r),
				new Vec2(w, h - r),
				...getArcPts(new Vec2(w - r, h - r), r, r, 0, 90),
				new Vec2(w - r, h),
				new Vec2(r, h),
				...getArcPts(new Vec2(r, h - r), r, r, 90, 180),
				new Vec2(0, h - r),
				new Vec2(0, r),
				...getArcPts(new Vec2(r, r), r, r, 180, 270),
			]

		}

		drawPolygon(Object.assign(opt, {
			offset,
			pts,
			...(opt.gradient ? {
				colors: opt.horizontal ? [
					opt.gradient[0],
					opt.gradient[1],
					opt.gradient[1],
					opt.gradient[0],
				] : [
					opt.gradient[0],
					opt.gradient[0],
					opt.gradient[1],
					opt.gradient[1],
				],
			} : {}),
		}))

	}

	function drawLine(opt: DrawLineOpt) {

		const { p1, p2 } = opt

		if (!p1 || !p2) {
			throw new Error("drawLine() requires properties \"p1\" and \"p2\".")
		}

		const w = opt.width || 1

		// the displacement from the line end point to the corner point
		const dis = p2.sub(p1).unit().normal().scale(w * 0.5)

		// calculate the 4 corner points of the line polygon
		const verts = [
			p1.sub(dis),
			p1.add(dis),
			p2.add(dis),
			p2.sub(dis),
		].map((p) => ({
			pos: new Vec2(p.x, p.y),
			uv: new Vec2(0),
			color: opt.color ?? Color.WHITE,
			opacity: opt.opacity ?? 1,
		}))

		drawRaw(verts, [0, 1, 3, 1, 2, 3], opt.fixed, gfx.defTex, opt.shader, opt.uniform)

	}

	function drawLines(opt: DrawLinesOpt) {

		const pts = opt.pts

		if (!pts) {
			throw new Error("drawLines() requires property \"pts\".")
		}

		if (pts.length < 2) {
			return
		}

		if (opt.radius && pts.length >= 3) {

			// TODO: line joines
			// TODO: rounded vertices for arbitury polygonic shape
			let minSLen = pts[0].sdist(pts[1])

			for (let i = 1; i < pts.length - 1; i++) {
				minSLen = Math.min(pts[i].sdist(pts[i + 1]), minSLen)
			}

			// eslint-disable-next-line
			const radius = Math.min(opt.radius, Math.sqrt(minSLen) / 2)

			drawLine(Object.assign(opt, { p1: pts[0], p2: pts[1] }))

			for (let i = 1; i < pts.length - 2; i++) {
				const p1 = pts[i]
				const p2 = pts[i + 1]
				drawLine(Object.assign(opt, {
					p1: p1,
					p2: p2,
				}))
			}

			drawLine(Object.assign(opt, {
				p1: pts[pts.length - 2],
				p2: pts[pts.length - 1],
			}))

		} else {

			for (let i = 0; i < pts.length - 1; i++) {
				drawLine(Object.assign(opt, {
					p1: pts[i],
					p2: pts[i + 1],
				}))
				// TODO: other line join types
				if (opt.join !== "none") {
					drawCircle(Object.assign(opt, {
						pos: pts[i],
						radius: opt.width / 2,
					}))
				}
			}

		}

	}

	function drawTriangle(opt: DrawTriangleOpt) {
		if (!opt.p1 || !opt.p2 || !opt.p3) {
			throw new Error("drawPolygon() requires properties \"p1\", \"p2\" and \"p3\".")
		}
		return drawPolygon(Object.assign(opt, {
			pts: [opt.p1, opt.p2, opt.p3],
		}))
	}

	function drawCircle(opt: DrawCircleOpt) {

		if (!opt.radius) {
			throw new Error("drawCircle() requires property \"radius\".")
		}

		if (opt.radius === 0) {
			return
		}

		drawEllipse(Object.assign(opt, {
			radiusX: opt.radius,
			radiusY: opt.radius,
			angle: 0,
		}))

	}

	function drawEllipse(opt: DrawEllipseOpt) {

		if (opt.radiusX === undefined || opt.radiusY === undefined) {
			throw new Error("drawEllipse() requires properties \"radiusX\" and \"radiusY\".")
		}

		if (opt.radiusX === 0 || opt.radiusY === 0) {
			return
		}

		const start = opt.start ?? 0
		const end = opt.end ?? 360
		const offset = anchorPt(opt.anchor ?? "center").scale(new Vec2(-opt.radiusX, -opt.radiusY))

		const pts = getArcPts(
			offset,
			opt.radiusX,
			opt.radiusY,
			start,
			end,
			opt.resolution,
		)

		// center
		pts.unshift(offset)

		const polyOpt = Object.assign(opt, {
			pts,
			radius: 0,
			...(opt.gradient ? {
				colors: [
					opt.gradient[0],
					...Array(pts.length - 1).fill(opt.gradient[1]),
				],
			} : {}),
		})

		// full circle with outline shouldn't have the center point
		if (end - start >= 360 && opt.outline) {
			if (opt.fill !== false) {
				drawPolygon(Object.assign(polyOpt, {
					outline: null,
				}))
			}
			drawPolygon(Object.assign(polyOpt, {
				pts: pts.slice(1),
				fill: false,
			}))
			return
		}

		drawPolygon(polyOpt)

	}

	function drawPolygon(opt: DrawPolygonOpt) {

		if (!opt.pts) {
			throw new Error("drawPolygon() requires property \"pts\".")
		}

		const npts = opt.pts.length

		if (npts < 3) {
			return
		}

		pushTransform()
		pushTranslate(opt.pos)
		pushScale(opt.scale)
		pushRotate(opt.angle)
		pushTranslate(opt.offset)

		if (opt.fill !== false) {

			const color = opt.color ?? Color.WHITE

			const verts = opt.pts.map((pt, i) => ({
				pos: new Vec2(pt.x, pt.y),
				uv: new Vec2(0, 0),
				color: opt.colors ? (opt.colors[i] ?? color) : color,
				opacity: opt.opacity ?? 1,
			}))

			// TODO: better triangulation
			const indices = [...Array(npts - 2).keys()]
				.map((n) => [0, n + 1, n + 2])
				.flat()

			drawRaw(verts, opt.indices ?? indices, opt.fixed, gfx.defTex, opt.shader, opt.uniform)

		}

		if (opt.outline) {
			drawLines({
				pts: [ ...opt.pts, opt.pts[0] ],
				radius: opt.radius,
				width: opt.outline.width,
				color: opt.outline.color,
				join: opt.outline.join,
				uniform: opt.uniform,
				fixed: opt.fixed,
				opacity: opt.opacity,
			})
		}

		popTransform()

	}

	function drawStenciled(content: () => void, mask: () => void, test: number) {

		flush()
		gl.clear(gl.STENCIL_BUFFER_BIT)
		gl.enable(gl.STENCIL_TEST)

		// don't perform test, pure write
		gl.stencilFunc(
			gl.NEVER,
			1,
			0xFF,
		)

		// always replace since we're writing to the buffer
		gl.stencilOp(
			gl.REPLACE,
			gl.REPLACE,
			gl.REPLACE,
		)

		mask()
		flush()

		// perform test
		gl.stencilFunc(
			test,
			1,
			0xFF,
		)

		// don't write since we're only testing
		gl.stencilOp(
			gl.KEEP,
			gl.KEEP,
			gl.KEEP,
		)

		content()
		flush()
		gl.disable(gl.STENCIL_TEST)

	}

	function drawMasked(content: () => void, mask: () => void) {
		drawStenciled(content, mask, gl.EQUAL)
	}

	function drawSubtracted(content: () => void, mask: () => void) {
		drawStenciled(content, mask, gl.NOTEQUAL)
	}

	function getViewportScale() {
		return (gfx.viewport.width + gfx.viewport.height) / (gfx.width + gfx.height)
	}

	function drawUnscaled(content: () => void) {
		flush()
		const ow = gfx.width
		const oh = gfx.height
		gfx.width = gfx.viewport.width
		gfx.height = gfx.viewport.height
		content()
		flush()
		gfx.width = ow
		gfx.height = oh
	}

	function applyCharTransform(fchar: FormattedChar, tr: CharTransform) {
		if (tr.pos) fchar.pos = fchar.pos.add(tr.pos)
		if (tr.scale) fchar.scale = fchar.scale.scale(vec2(tr.scale))
		if (tr.angle) fchar.angle += tr.angle
		if (tr.color) fchar.color = fchar.color.mult(tr.color)
		if (tr.opacity) fchar.opacity *= tr.opacity
	}

	// TODO: escape
	// eslint-disable-next-line
	const TEXT_STYLE_RE = /\[(?<style>\w+)\](?<text>.*?)\[\/\k<style>\]/g

	// TODO: handle nested
	function compileStyledText(text: string): {
		charStyleMap: Record<number, string[]>,
		text: string,
	} {

		const charStyleMap = {}
		// get the text without the styling syntax
		const renderText = text.replace(TEXT_STYLE_RE, "$2")
		let idxOffset = 0

		// put each styled char index into a map for easy access when iterating each char
		for (const match of text.matchAll(TEXT_STYLE_RE)) {
			const origIdx = match.index - idxOffset
			for (let i = 0; i < match.groups.text.length; i++) {
				charStyleMap[i + origIdx] = [match.groups.style]
			}
			// omit the style syntax in format string when calculating index
			idxOffset += match[0].length - match.groups.text.length
		}

		return {
			charStyleMap: charStyleMap,
			text: renderText,
		}

	}

	type FontAtlas = {
		font: BitmapFontData,
		cursor: Vec2,
		outline: number,
	}

	const fontAtlases: Record<string, FontAtlas> = {}

	// TODO: cache formatted text
	// format text and return a list of chars with their calculated position
	function formatText(opt: DrawTextOpt): FormattedText {

		if (opt.text === undefined) {
			throw new Error("formatText() requires property \"text\".")
		}

		let font = resolveFont(opt.font)

		// if it's still loading
		if (opt.text === "" || font instanceof Asset || !font) {
			return {
				width: 0,
				height: 0,
				chars: [],
				opt: opt,
			}
		}

		const { charStyleMap, text } = compileStyledText(opt.text + "")
		const chars = text.split("")

		// if it's not bitmap font, we draw it with 2d canvas or use cached image
		if (font instanceof FontData || typeof font === "string") {

			const fontName = font instanceof FontData ? font.fontface.family : font
			const opts: LoadFontOpt = font instanceof FontData ? {
				outline: font.outline,
				filter: font.filter,
			} : {
				outline: 0,
				filter: DEF_FONT_FILTER,
			}

			// TODO: customizable font tex filter
			const atlas: FontAtlas = fontAtlases[fontName] ?? {
				font: {
					tex: new Texture(FONT_ATLAS_WIDTH, FONT_ATLAS_HEIGHT, {
						filter: opts.filter,
					}),
					map: {},
					size: DEF_TEXT_CACHE_SIZE,
				},
				cursor: new Vec2(0),
				outline: opts.outline,
			}

			if (!fontAtlases[fontName]) {
				fontAtlases[fontName] = atlas
			}

			font = atlas.font

			for (const ch of chars) {

				if (!atlas.font.map[ch]) {

					// TODO: use assets.packer to pack font texture
					const c2d = app.fontCacheCtx
					c2d.clearRect(0, 0, app.fontCacheCanvas.width, app.fontCacheCanvas.height)
					c2d.font = `${font.size}px ${fontName}`
					c2d.textBaseline = "top"
					c2d.textAlign = "left"
					c2d.fillStyle = "#ffffff"
					const m = c2d.measureText(ch)
					let w = Math.ceil(m.width)
					let h = font.size
					if (atlas.outline) {
						c2d.lineJoin = "round"
						c2d.lineWidth = atlas.outline * 2
						c2d.strokeStyle = "#000000"
						c2d.strokeText(ch, atlas.outline, atlas.outline)
						w += atlas.outline * 2
						h += atlas.outline * 3
					}
					c2d.fillText(ch, atlas.outline, atlas.outline)

					const img = c2d.getImageData(0, 0, w, h)

					// if we are about to exceed the X axis of the texture, go to another line
					if (atlas.cursor.x + w > FONT_ATLAS_WIDTH) {
						atlas.cursor.x = 0
						atlas.cursor.y += h
						if (atlas.cursor.y > FONT_ATLAS_HEIGHT) {
							// TODO: create another atlas
							throw new Error("Font atlas exceeds character limit")
						}
					}

					font.tex.update(img, atlas.cursor.x, atlas.cursor.y)
					font.map[ch] = new Quad(atlas.cursor.x, atlas.cursor.y, w, h)
					atlas.cursor.x += w

				}

			}

		}

		const size = opt.size || font.size
		const scale = vec2(opt.scale ?? 1).scale(size / font.size)
		const lineSpacing = opt.lineSpacing ?? 0
		const letterSpacing = opt.letterSpacing ?? 0
		let curX = 0
		let tw = 0
		let th = 0
		const lines: Array<{
			width: number,
			chars: FormattedChar[],
		}> = []
		let curLine: FormattedChar[] = []
		let cursor = 0
		let lastSpace = null
		let lastSpaceWidth = null

		// TODO: word break
		while (cursor < chars.length) {

			let ch = chars[cursor]

			// always new line on '\n'
			if (ch === "\n") {

				th += size + lineSpacing

				lines.push({
					width: curX - letterSpacing,
					chars: curLine,
				})

				lastSpace = null
				lastSpaceWidth = null
				curX = 0
				curLine = []

			} else {

				let q = font.map[ch]

				// TODO: leave space if character not found?
				if (q) {

					let gw = q.w * scale.x

					if (opt.width && curX + gw > opt.width) {
						// new line on last word if width exceeds
						th += size + lineSpacing
						if (lastSpace != null) {
							cursor -= curLine.length - lastSpace
							ch = chars[cursor]
							q = font.map[ch]
							gw = q.w * scale.x
							// omit trailing space
							curLine = curLine.slice(0, lastSpace - 1)
							curX = lastSpaceWidth
						}
						lastSpace = null
						lastSpaceWidth = null
						lines.push({
							width: curX - letterSpacing,
							chars: curLine,
						})
						curX = 0
						curLine = []
					}

					// push char
					curLine.push({
						tex: font.tex,
						width: q.w,
						height: q.h,
						// without some padding there'll be visual artifacts on edges
						quad: new Quad(
							q.x / font.tex.width,
							q.y / font.tex.height,
							q.w / font.tex.width,
							q.h / font.tex.height,
						),
						ch: ch,
						pos: new Vec2(curX, th),
						opacity: opt.opacity ?? 1,
						color: opt.color ?? Color.WHITE,
						scale: vec2(scale),
						angle: 0,
					})

					if (ch === " ") {
						lastSpace = curLine.length
						lastSpaceWidth = curX
					}

					curX += gw
					tw = Math.max(tw, curX)
					curX += letterSpacing

				}

			}

			cursor++

		}

		lines.push({
			width: curX - letterSpacing,
			chars: curLine,
		})

		th += size

		if (opt.width) {
			tw = opt.width
		}

		const fchars: FormattedChar[] = []

		for (const line of lines) {

			const ox = (tw - line.width) * alignPt(opt.align ?? "left")

			for (const fchar of line.chars) {

				const q = font.map[fchar.ch]
				const idx = fchars.length

				fchar.pos = fchar.pos.add(ox, 0).add(
					q.w * scale.x * 0.5,
					q.h * scale.y * 0.5,
				)

				if (opt.transform) {
					const tr = typeof opt.transform === "function"
						? opt.transform(idx, fchar.ch)
						: opt.transform
					if (tr) {
						applyCharTransform(fchar, tr)
					}
				}

				if (charStyleMap[idx]) {
					const styles = charStyleMap[idx]
					for (const name of styles) {
						const style = opt.styles[name]
						const tr = typeof style === "function"
							? style(idx, fchar.ch)
							: style
						if (tr) {
							applyCharTransform(fchar, tr)
						}
					}
				}

				fchars.push(fchar)

			}

		}

		return {
			width: tw,
			height: th,
			chars: fchars,
			opt: opt,
		}

	}

	function drawText(opt: DrawTextOpt) {
		drawFormattedText(formatText(opt))
	}

	function drawFormattedText(ftext: FormattedText) {
		pushTransform()
		pushTranslate(ftext.opt.pos)
		pushRotate(ftext.opt.angle)
		pushTranslate(anchorPt(ftext.opt.anchor ?? "topleft").add(1, 1).scale(ftext.width, ftext.height).scale(-0.5))
		ftext.chars.forEach((ch) => {
			drawUVQuad({
				tex: ch.tex,
				width: ch.width,
				height: ch.height,
				pos: ch.pos,
				scale: ch.scale,
				angle: ch.angle,
				color: ch.color,
				opacity: ch.opacity,
				quad: ch.quad,
				anchor: "center",
				uniform: ftext.opt.uniform,
				shader: ftext.opt.shader,
				fixed: ftext.opt.fixed,
			})
		})
		popTransform()
	}

	// update viewport based on user setting and fullscreen state
	function updateViewport() {

		// content size (scaled content size, with scale, stretch and letterbox)
		// view size (unscaled viewport size)
		// window size (will be the same as view size except letterbox mode)

		// canvas size
		const pd = app.pixelDensity
		const cw = gl.drawingBufferWidth / pd
		const ch = gl.drawingBufferHeight / pd

		if (isFullscreen()) {
			// TODO: doesn't work with letterbox
			const ww = window.innerWidth
			const wh = window.innerHeight
			const rw = ww / wh
			const rc = cw / ch
			if (rw > rc) {
				const sw = window.innerHeight * rc
				gfx.viewport = {
					x: (ww - sw) / 2,
					y: 0,
					width: sw,
					height: wh,
				}
			} else {
				const sh = window.innerWidth / rc
				gfx.viewport = {
					x: 0,
					y: (wh - sh) / 2,
					width: ww,
					height: sh,
				}
			}
			return
		}

		if (gopt.letterbox) {

			if (!gopt.width || !gopt.height) {
				throw new Error("Letterboxing requires width and height defined.")
			}

			const rc = cw / ch
			const rg = gopt.width / gopt.height

			if (rc > rg) {
				if (!gopt.stretch) {
					gfx.width = ch * rg
					gfx.height = ch
				}
				const sw = ch * rg
				const sh = ch
				const x = (cw - sw) / 2
				gl.scissor(x * pd, 0, sw * pd, sh * pd)
				gl.viewport(x * pd, 0, sw * pd, ch * pd)
				gfx.viewport = {
					x: x,
					y: 0,
					width: sw,
					height: ch,
				}
			} else {
				if (!gopt.stretch) {
					gfx.width = cw
					gfx.height = cw / rg
				}
				const sw = cw
				const sh = cw / rg
				const y = (ch - sh) / 2
				gl.scissor(0, y * pd, sw * pd, sh * pd)
				gl.viewport(0, y * pd, cw * pd, sh * pd)
				gfx.viewport = {
					x: 0,
					y: y,
					width: cw,
					height: sh,
				}
			}

			return

		}

		if (gopt.stretch) {

			if (!gopt.width || !gopt.height) {
				throw new Error("Stretching requires width and height defined.")
			}

			gl.viewport(0, 0, cw * pd, ch * pd)

			gfx.viewport = {
				x: 0,
				y: 0,
				width: cw,
				height: ch,
			}

			return
		}

		const gscale = gopt.scale ?? 1

		gfx.width = cw / gscale
		gfx.height = ch / gscale
		gl.viewport(0, 0, cw * pd, ch * pd)

		gfx.viewport = {
			x: 0,
			y: 0,
			width: cw,
			height: ch,
		}

	}

	// get game width
	function width(): number {
		return gfx.width
	}

	// get game height
	function height(): number {
		return gfx.height
	}

	const canvasEvents: EventList<HTMLElementEventMap> = {}
	const docEvents: EventList<DocumentEventMap> = {}
	const winEvents: EventList<WindowEventMap> = {}

	// transform a point from window space to content space
	function windowToContent(pt: Vec2) {
		return new Vec2(
			(pt.x - gfx.viewport.x) * width() / gfx.viewport.width,
			(pt.y - gfx.viewport.y) * height() / gfx.viewport.height,
		)
	}

	// transform a point from content space to view space
	function contentToView(pt: Vec2) {
		return new Vec2(
			pt.x * gfx.viewport.width / gfx.width,
			pt.y * gfx.viewport.height / gfx.height,
		)
	}

	// set game mouse pos from window mouse pos
	function setMousePos(x: number, y: number) {
		const mpos = windowToContent(new Vec2(x, y))
		app.mousePos = mpos
		app.mouseStarted = true
		app.isMouseMoved = true
	}

	canvasEvents.mousemove = (e) => {
		const [x, y] = [e.offsetX, e.offsetY]
		const [dx, dy] = [e.movementX, e.movementY]
		game.ev.onOnce("input", () => {
			setMousePos(x, y)
			app.mouseDeltaPos = vec2(dx, dy)
			game.ev.trigger("mouseMove")
		})
	}

	canvasEvents.mousedown = (e) => {
		game.ev.onOnce("input", () => {
			const m = MOUSE_BUTTONS[e.button]
			if (m) app.mouseState.press(m)
			game.ev.trigger("mousePress", m)
		})
	}

	canvasEvents.mouseup = (e) => {
		game.ev.onOnce("input", () => {
			const m = MOUSE_BUTTONS[e.button]
			if (m) app.mouseState.release(m)
			game.ev.trigger("mouseRelease", m)
		})
	}

	canvasEvents.keydown = (e) => {
		if (PREVENT_DEFAULT_KEYS.has(e.key)) {
			e.preventDefault()
		}
		game.ev.onOnce("input", () => {
			const k = KEY_ALIAS[e.key] || e.key.toLowerCase()
			if (k.length === 1) {
				game.ev.trigger("charInput", k)
				app.charInputted.push(k)
			} else if (k === "space") {
				game.ev.trigger("charInput", " ")
				app.charInputted.push(" ")
			}
			if (e.repeat) {
				app.keyState.pressRepeat(k)
				game.ev.trigger("keyPressRepeat", k)
			} else {
				app.keyState.press(k)
				game.ev.trigger("keyPressRepeat", k)
				game.ev.trigger("keyPress", k)
			}
		})
	}

	canvasEvents.keyup = (e) => {
		game.ev.onOnce("input", () => {
			const k = KEY_ALIAS[e.key] || e.key.toLowerCase()
			app.keyState.release(k)
			game.ev.trigger("keyRelease", k)
		})
	}

	canvasEvents.touchstart = (e) => {
		// disable long tap context menu
		e.preventDefault()
		game.ev.onOnce("input", () => {
			const touches = [...e.changedTouches]
			touches.forEach((t) => {
				game.ev.trigger(
					"touchStart",
					windowToContent(new Vec2(t.clientX, t.clientY)),
					t,
				)
			})
			if (gopt.touchToMouse !== false) {
				setMousePos(touches[0].clientX, touches[0].clientY)
				app.mouseState.press("left")
				game.ev.trigger("mousePress", "left")
			}
		})
	}

	canvasEvents.touchmove = (e) => {
		// disable scrolling
		e.preventDefault()
		game.ev.onOnce("input", () => {
			const touches = [...e.changedTouches]
			touches.forEach((t) => {
				game.ev.trigger(
					"touchMove",
					windowToContent(new Vec2(t.clientX, t.clientY)),
					t,
				)
			})
			if (gopt.touchToMouse !== false) {
				game.ev.trigger("mouseMove")
				setMousePos(touches[0].clientX, touches[0].clientY)
			}
		})
	}

	canvasEvents.touchend = (e) => {
		game.ev.onOnce("input", () => {
			const touches = [...e.changedTouches]
			touches.forEach((t) => {
				game.ev.trigger(
					"touchEnd",
					windowToContent(new Vec2(t.clientX, t.clientY)),
					t,
				)
			})
			if (gopt.touchToMouse !== false) {
				app.mouseState.release("left")
				game.ev.trigger("mouseRelease", "left")
			}
		})
	}

	canvasEvents.touchcancel = (e) => {
		game.ev.onOnce("input", () => {
			const touches = [...e.changedTouches]
			touches.forEach((t) => {
				game.ev.trigger(
					"touchEnd",
					windowToContent(new Vec2(t.clientX, t.clientY)),
					t,
				)
			})
			if (gopt.touchToMouse !== false) {
				app.mouseState.release("left")
				game.ev.trigger("mouseRelease", "left")
			}
		})
	}

	// TODO: option to not prevent default?
	canvasEvents.wheel = (e) => {
		e.preventDefault()
		game.ev.onOnce("input", () => {
			game.ev.trigger("scroll", new Vec2(e.deltaX, e.deltaY))
		})
	}

	canvasEvents.contextmenu = (e) => e.preventDefault()

	docEvents.visibilitychange = () => {
		switch (document.visibilityState) {
			case "visible":
				// prevent a surge of dt() when switch back after the tab being hidden for a while
				app.skipTime = true
				if (!debug.paused) {
					audio.ctx.resume()
				}
				break
			case "hidden":
				// reset input when visibility changed
				app.keyState = new ButtonState()
				app.mouseState = new ButtonState()
				app.virtualButtonState = new ButtonState()
				if (!gopt.backgroundAudio) {
					audio.ctx.suspend()
				}
				break
		}
	}

	winEvents.error = (e) => {
		if (e.error) {
			handleErr(e.error)
		} else {
			handleErr(new Error(e.message))
		}
	}

	winEvents.gamepadconnected = (e) => {
		game.ev.onOnce("input", () => {
			game.ev.trigger("gamepadConnect", e.gamepad)
		})
	}

	winEvents.gamepaddisconnected = (e) => {
		game.ev.onOnce("input", () => {
			game.ev.trigger("gamepadDisconnect", e.gamepad)
		})
	}

	winEvents.unhandledrejection = (e) => handleErr(e.reason)

	for (const name in canvasEvents) {
		app.canvas.addEventListener(name, canvasEvents[name])
	}

	for (const name in docEvents) {
		document.addEventListener(name, docEvents[name])
	}

	for (const name in winEvents) {
		window.addEventListener(name, winEvents[name])
	}

	function mousePos(): Vec2 {
		return app.mousePos.clone()
	}

	function mouseDeltaPos(): Vec2 {
		return app.mouseDeltaPos.clone()
	}

	function isMousePressed(m: MouseButton = "left"): boolean {
		return app.mouseState.pressed.has(m)
	}

	function isMouseDown(m: MouseButton = "left"): boolean {
		return app.mouseState.down.has(m)
	}

	function isMouseReleased(m: MouseButton = "left"): boolean {
		return app.mouseState.released.has(m)
	}

	function isMouseMoved(): boolean {
		return app.isMouseMoved
	}

	function isKeyPressed(k?: Key): boolean {
		return k === undefined
			? app.keyState.pressed.size > 0
			: app.keyState.pressed.has(k)
	}

	function isKeyPressedRepeat(k?: Key): boolean {
		return k === undefined
			? app.keyState.pressedRepeat.size > 0
			: app.keyState.pressedRepeat.has(k)
	}

	function isKeyDown(k?: Key): boolean {
		return k === undefined
			? app.keyState.down.size > 0
			: app.keyState.down.has(k)
	}

	function isKeyReleased(k?: Key): boolean {
		return k === undefined
			? app.keyState.released.size > 0
			: app.keyState.released.has(k)
	}

	function isVirtualButtonPressed(btn: VirtualButton): boolean {
		return app.virtualButtonState.pressed.has(btn)
	}

	function isVirtualButtonDown(btn: VirtualButton): boolean {
		return app.virtualButtonState.down.has(btn)
	}

	function isVirtualButtonReleased(btn: VirtualButton): boolean {
		return app.virtualButtonState.released.has(btn)
	}

	function isGamepadButtonPressed(btn?: GamepadButton): boolean {
		return btn === undefined
			? app.gamepadButtonState.pressed.size > 0
			: app.gamepadButtonState.pressed.has(btn)
	}

	function isGamepadButtonDown(btn?: GamepadButton): boolean {
		return btn === undefined
			? app.gamepadButtonState.down.size > 0
			: app.gamepadButtonState.down.has(btn)
	}

	function isGamepadButtonReleased(btn?: GamepadButton): boolean {
		return btn === undefined
			? app.gamepadButtonState.released.size > 0
			: app.gamepadButtonState.released.has(btn)
	}

	// function getGamepadStick(stick: "left" | "right"): boolean {

	// }

	function charInputted(): string[] {
		return [...app.charInputted]
	}

	function time(): number {
		return app.time
	}

	// get a base64 png image of canvas
	function screenshot(): string {
		return app.canvas.toDataURL()
	}

	function setCursor(c: Cursor): void {
		app.canvas.style.cursor = c
	}

	function getCursor(): Cursor {
		return app.canvas.style.cursor
	}

	function setCursorLocked(b: boolean): void {
		if (b) {
			try {
				const res = app.canvas.requestPointerLock() as unknown as Promise<void>
				if (res.catch) {
					res.catch((e) => console.error(e))
				}
			} catch (e) {
				console.error(e)
			}
		} else {
			document.exitPointerLock()
		}
	}

	function isCursorLocked(): boolean {
		return !!document.pointerLockElement
	}

	function setFullscreen(f: boolean = true) {
		if (f) {
			enterFullscreen(app.canvas)
		} else {
			exitFullscreen()
		}
	}

	function isFullscreen(): boolean {
		return Boolean(getFullscreenElement())
	}

	function isTouchScreen() {
		return app.isTouchScreen
	}

	const debug: Debug = {
		inspect: false,
		timeScale: 1,
		showLog: true,
		fps: () => app.fpsCounter.fps,
		numFrames: () => app.numFrames,
		stepFrame: updateFrame,
		drawCalls: () => gfx.drawCalls,
		clearLog: () => game.logs = [],
		log: (msg) => {
			const max = gopt.logMax ?? LOG_MAX
			const style = msg instanceof Error ? "error" : "info"
			game.logs.unshift(`${`[time]${time().toFixed(2)}[/time] `}[${style}]${msg?.toString ? msg.toString() : msg}[/${style}]`)
			if (game.logs.length > max) {
				game.logs = game.logs.slice(0, max)
			}
		},
		error: (msg) => debug.log(new Error(msg.toString ? msg.toString() : msg as string)),
		curRecording: null,
		get paused() {
			return app.paused
		},
		set paused(v) {
			app.paused = v
			if (v) {
				audio.ctx.suspend()
			} else {
				audio.ctx.resume()
			}
		},
	}

	function dt() {
		return app.dt * debug.timeScale
	}

	function camPos(...pos: Vec2Args): Vec2 {
		if (pos.length > 0) {
			game.cam.pos = vec2(...pos)
		}
		return game.cam.pos ? game.cam.pos.clone() : center()
	}

	function camScale(...scale: Vec2Args): Vec2 {
		if (scale.length > 0) {
			game.cam.scale = vec2(...scale)
		}
		return game.cam.scale.clone()
	}

	function camRot(angle: number): number {
		if (angle !== undefined) {
			game.cam.angle = angle
		}
		return game.cam.angle
	}

	function shake(intensity: number = 12) {
		game.cam.shake = intensity
	}

	function toScreen(p: Vec2): Vec2 {
		return game.cam.transform.multVec2(p)
	}

	function toWorld(p: Vec2): Vec2 {
		return game.cam.transform.invert().multVec2(p)
	}

	function calcTransform(obj: GameObj): Mat4 {
		const tr = new Mat4()
		if (obj.pos) tr.translate(obj.pos)
		if (obj.scale) tr.scale(obj.scale)
		if (obj.angle) tr.rotate(obj.angle)
		return obj.parent ? tr.mult(obj.parent.transform) : tr
	}

	function make<T>(comps: CompList<T>): GameObj<T> {

		const compStates = new Map()
		const cleanups = {}
		const ev = new EventHandler()

		// TODO: "this" should be typed here
		const obj = {

			id: uid(),
			// TODO: a nice way to hide / pause when add()-ing
			hidden: false,
			paused: false,
			transform: new Mat4(),
			children: [],
			parent: null,

			add<T2>(a: CompList<T2> | GameObj<T2>): GameObj<T2> {
				const obj = (() => {
					if (Array.isArray(a)) {
						return make(a)
					}
					if (a.parent) {
						throw new Error("Cannot add a game obj that already has a parent.")
					}
					return a
				})()
				obj.parent = this
				obj.transform = calcTransform(obj)
				this.children.push(obj)
				obj.trigger("add", obj)
				game.ev.trigger("add", obj)
				return obj
			},

			readd(obj: GameObj): GameObj {
				const idx = this.children.indexOf(obj)
				if (idx !== -1) {
					this.children.splice(idx, 1)
					this.children.push(obj)
				}
				return obj
			},

			remove(obj: GameObj): void {
				const idx = this.children.indexOf(obj)
				if (idx !== -1) {
					obj.trigger("destroy")
					game.ev.trigger("destroy", obj)
					obj.parent = null
					this.children.splice(idx, 1)
				}
			},

			removeAll(tag: Tag) {
				this.get(tag).forEach((obj) => this.remove(obj))
			},

			update() {
				if (this.paused) return
				this.children
					.sort((o1, o2) => (o1.z ?? 0) - (o2.z ?? 0))
					.forEach((child) => child.update())
				this.trigger("update")
			},

			draw(this: GameObj<PosComp | ScaleComp | RotateComp>) {
				if (this.hidden) return
				pushTransform()
				pushTranslate(this.pos)
				pushScale(this.scale)
				pushRotate(this.angle)
				// TODO: automatically don't draw if offscreen
				this.trigger("draw")
				this.children
					.sort((o1, o2) => (o1.z ?? 0) - (o2.z ?? 0))
					.forEach((child) => child.draw())
				popTransform()
			},

			drawInspect(this: GameObj<PosComp | ScaleComp | RotateComp>) {
				if (this.hidden) return
				pushTransform()
				pushTranslate(this.pos)
				pushScale(this.scale)
				pushRotate(this.angle)
				this.children
					.sort((o1, o2) => (o1.z ?? 0) - (o2.z ?? 0))
					.forEach((child) => child.drawInspect())
				this.trigger("drawInspect")
				popTransform()
			},

			// use a comp, or tag
			use(comp: Comp | Tag) {

				if (!comp) {
					return
				}

				// tag
				if (typeof comp === "string") {
					return this.use({
						id: comp,
					})
				}

				let gc = []

				// clear if overwrite
				if (comp.id) {
					this.unuse(comp.id)
					cleanups[comp.id] = []
					gc = cleanups[comp.id]
					compStates.set(comp.id, comp)
				}

				for (const k in comp) {

					if (COMP_DESC.has(k)) {
						continue
					}

					const prop = Object.getOwnPropertyDescriptor(comp, k)

					if (typeof prop.value === "function") {
						comp[k] = comp[k].bind(this)
					}

					if (prop.set) {
						Object.defineProperty(comp, k, {
							set: prop.set.bind(this),
						})
					}

					if (prop.get) {
						Object.defineProperty(comp, k, {
							get: prop.get.bind(this),
						})
					}

					if (COMP_EVENTS.has(k)) {
						gc.push(this.on(k, comp[k]).cancel)
					} else {
						if (this[k] === undefined) {
							// assign comp fields to game obj
							Object.defineProperty(this, k, {
								get: () => comp[k],
								set: (val) => comp[k] = val,
								configurable: true,
								enumerable: true,
							})
							gc.push(() => delete this[k])
						} else {
							throw new Error(`Duplicate component property: "${k}"`)
						}
					}

				}

				// check for component dependencies
				const checkDeps = () => {
					if (!comp.require) return
					for (const dep of comp.require) {
						if (!this.c(dep)) {
							throw new Error(`Component "${comp.id}" requires component "${dep}"`)
						}
					}
				}

				if (comp.destroy) {
					gc.push(comp.destroy.bind(this))
				}

				// manually trigger add event if object already exist
				if (this.exists()) {
					checkDeps()
					if (comp.add) comp.add.call(this)
				} else {
					if (comp.require) {
						gc.push(this.on("add", checkDeps).cancel)
					}
				}

			},

			unuse(id: Tag) {
				if (cleanups[id]) {
					cleanups[id].forEach((e) => e())
					delete cleanups[id]
				}
				if (compStates.has(id)) {
					compStates.delete(id)
				}
			},

			c(id: Tag): Comp {
				return compStates.get(id)
			},

			get(t: Tag | Tag[], opts: GetOpt = {}): GameObj[] {
				let list: GameObj[] = opts.recursive
					? this.children.flatMap((child) => [child, ...child.children])
					: this.children
				list = list.filter((child) => t ? child.is(t) : true)
				if (opts.liveUpdate) {
					const isChild = (obj) => {
						return opts.recursive
							? this.isAncestorOf(obj)
							: obj.parent === this
					}
					// TODO: handle when object add / remove tags
					// TODO: a way to cancel the events?
					onAdd((obj) => {
						if (isChild(obj) && obj.is(t)) {
							list.push(obj)
						}
					})
					onDestroy((obj) => {
						if (isChild(obj) && obj.is(t)) {
							const idx = list.findIndex((o) => o.id === obj.id)
							if (idx !== -1) {
								list.splice(idx, 1)
							}
						}
					})
				}
				return list
			},

			isAncestorOf(obj: GameObj) {
				if (!obj.parent) {
					return false
				}
				return obj.parent === this || this.isAncestorOf(obj.parent)
			},

			exists(): boolean {
				return game.root.isAncestorOf(this)
			},

			is(tag: Tag | Tag[]): boolean {
				if (tag === "*") {
					return true
				}
				if (Array.isArray(tag)) {
					for (const t of tag) {
						if (!this.c(t)) {
							return false
						}
					}
					return true
				} else {
					return this.c(tag) != null
				}
			},

			on(name: string, action: (...args) => void): EventController {
				return ev.on(name, action.bind(this))
			},

			trigger(name: string, ...args): void {
				ev.trigger(name, ...args)
				game.objEvents.trigger(name, this, ...args)
			},

			destroy() {
				if (this.parent) {
					this.parent.remove(this)
				}
			},

			inspect() {
				const info = {}
				for (const [tag, comp] of compStates) {
					info[tag] = comp.inspect ? comp.inspect() : null
				}
				return info
			},

			onAdd(cb: () => void): EventController {
				return this.on("add", cb)
			},

			onUpdate(cb: () => void): EventController {
				return this.on("update", cb)
			},

			onDraw(cb: () => void): EventController {
				return this.on("draw", cb)
			},

			onDestroy(action: () => void): EventController {
				return this.on("destroy", action)
			},

			clearEvents() {
				ev.clear()
			},

		}

		for (const comp of comps) {
			obj.use(comp)
		}

		return obj as unknown as GameObj<T>

	}

	// add an event to a tag
	function on(event: string, tag: Tag, cb: (obj: GameObj, ...args) => void): EventController {
		if (!game.objEvents[event]) {
			game.objEvents[event] = new IDList()
		}
		return game.objEvents.on(event, (obj, ...args) => {
			if (obj.is(tag)) {
				cb(obj, ...args)
			}
		})
	}

	// add update event to a tag or global update
	const onUpdate = ((tag: Tag | (() => void), action?: (obj: GameObj) => void) => {
		if (typeof tag === "function" && action === undefined) {
			const obj = add([{ update: tag }])
			return {
				get paused() {
					return obj.paused
				},
				set paused(p) {
					obj.paused = p
				},
				cancel: () => obj.destroy(),
			}
		} else if (typeof tag === "string") {
			return on("update", tag, action)
		}
	}) as KaboomCtx["onUpdate"]

	// add draw event to a tag or global draw
	const onDraw = ((tag: Tag | (() => void), action?: (obj: GameObj) => void) => {
		if (typeof tag === "function" && action === undefined) {
			const obj = add([{ draw: tag }])
			return {
				get paused() {
					return obj.hidden
				},
				set paused(p) {
					obj.hidden = p
				},
				cancel: () => obj.destroy(),
			}
		} else if (typeof tag === "string") {
			return on("draw", tag, action)
		}
	}) as KaboomCtx["onDraw"]

	function onAdd(tag: Tag | ((obj: GameObj) => void), action?: (obj: GameObj) => void) {
		if (typeof tag === "function" && action === undefined) {
			return game.ev.on("add", tag)
		} else if (typeof tag === "string") {
			return on("add", tag, action)
		}
	}

	function onDestroy(tag: Tag | ((obj: GameObj) => void), action?: (obj: GameObj) => void) {
		if (typeof tag === "function" && action === undefined) {
			return game.ev.on("destroy", tag)
		} else if (typeof tag === "string") {
			return on("destroy", tag, action)
		}
	}

	// add an event that runs with objs with t1 collides with objs with t2
	function onCollide(
		t1: Tag,
		t2: Tag,
		f: (a: GameObj, b: GameObj, col?: Collision) => void,
	): EventController {
		return on("collide", t1, (a, b, col) => b.is(t2) && f(a, b, col))
	}

	function onCollideUpdate(
		t1: Tag,
		t2: Tag,
		f: (a: GameObj, b: GameObj, col?: Collision) => void,
	): EventController {
		return on("collideUpdate", t1, (a, b, col) => b.is(t2) && f(a, b, col))
	}

	function onCollideEnd(
		t1: Tag,
		t2: Tag,
		f: (a: GameObj, b: GameObj, col?: Collision) => void,
	): EventController {
		return on("collideEnd", t1, (a, b, col) => b.is(t2) && f(a, b, col))
	}

	function forAllCurrentAndFuture(t: Tag, action: (obj: GameObj) => void) {
		get(t).forEach(action)
		onAdd(t, action)
	}

	// add an event that runs when objs with tag t is clicked
	function onClick(tag: Tag | (() => void), action?: (obj: GameObj) => void): EventController {
		if (typeof tag === "function") {
			return onMousePress(tag)
		} else {
			const events = []
			forAllCurrentAndFuture(tag, (obj) => {
				if (!obj.area)
					throw new Error("onClick() requires the object to have area() component")
				events.push(obj.onClick(() => action(obj)))
			})
			return EventController.join(events)
		}
	}

	// add an event that runs once when objs with tag t is hovered
	function onHover(t: Tag, action: (obj: GameObj) => void): EventController {
		const events = []
		forAllCurrentAndFuture(t, (obj) => {
			if (!obj.area)
				throw new Error("onHover() requires the object to have area() component")
			events.push(obj.onHover(() => action(obj)))
		})
		return EventController.join(events)
	}

	// add an event that runs once when objs with tag t is hovered
	function onHoverUpdate(t: Tag, action: (obj: GameObj) => void): EventController {
		const events = []
		forAllCurrentAndFuture(t, (obj) => {
			if (!obj.area)
				throw new Error("onHoverUpdate() requires the object to have area() component")
			events.push(obj.onHoverUpdate(() => action(obj)))
		})
		return EventController.join(events)
	}

	// add an event that runs once when objs with tag t is unhovered
	function onHoverEnd(t: Tag, action: (obj: GameObj) => void): EventController {
		const events = []
		forAllCurrentAndFuture(t, (obj) => {
			if (!obj.area)
				throw new Error("onHoverEnd() requires the object to have area() component")
			events.push(obj.onHoverEnd(() => action(obj)))
		})
		return EventController.join(events)
	}

	// TODO: use PromiseLike?
	// add an event that'd be run after t
	function wait(time: number, action?: () => void): TimerController {
		let t = 0
		const actions = []
		if (action) actions.push(action)
		const ev = onUpdate(() => {
			t += dt()
			if (t >= time) {
				ev.cancel()
				actions.forEach((action) => action())
			}
		})
		return {
			paused: ev.paused,
			cancel: ev.cancel,
			onEnd(action) {
				actions.push(action)
			},
			then(action) {
				this.onEnd(action)
				return this
			},
		}
	}

	// add an event that's run every t seconds
	function loop(t: number, action: () => void): EventController {

		let curTimer: null | TimerController = null

		const newAction = () => {
			// TODO: should f be execute right away as loop() is called?
			curTimer = wait(t, newAction)
			action()
		}

		curTimer = wait(0, newAction)

		return {
			get paused() {
				return curTimer.paused
			},
			set paused(p) {
				curTimer.paused = p
			},
			cancel: () => curTimer.cancel(),
		}

	}

	// input callbacks
	const onKeyDown = ((
		key?: Key | ((k: Key) => void),
		action?: (k: Key) => void,
	) => {
		if (typeof key === "function") {
			return game.ev.on("keyDown", key)
		} else if (typeof key === "string" && typeof action === "function") {
			return game.ev.on("keyDown", (k) => k === key && action(key))
		}
	}) as KaboomCtx["onKeyDown"]

	const onKeyPress = ((
		key?: Key | ((k: Key) => void),
		action?: (k: Key) => void,
	) => {
		if (typeof key === "function") {
			return game.ev.on("keyPress", key)
		} else if (typeof key === "string" && typeof action === "function") {
			return game.ev.on("keyPress", (k) => k === key && action(key))
		}
	}) as KaboomCtx["onKeyPress"]

	const onKeyPressRepeat = ((
		key?: Key | ((k: Key) => void),
		action?: (k: Key) => void,
	) => {
		if (typeof key === "function") {
			return game.ev.on("keyPressRepeat", key)
		} else if (typeof key === "string" && typeof action === "function") {
			return game.ev.on("keyPressRepeat", (k) => k === key && action(key))
		}
	}) as KaboomCtx["onKeyPressRepeat"]

	const onKeyRelease = ((
		key?: Key | ((k: Key) => void),
		action?: (k: Key) => void,
	) => {
		if (typeof key === "function") {
			return game.ev.on("keyRelease", key)
		} else if (typeof key === "string" && typeof action === "function") {
			return game.ev.on("keyRelease", (k) => k === key && action(key))
		}
	}) as KaboomCtx["onKeyRelease"]

	function onMouseDown(
		mouse: MouseButton | ((m: MouseButton) => void),
		action?: (m: MouseButton) => void,
	): EventController {
		if (typeof mouse === "function") {
			return game.ev.on("mouseDown", (m) => mouse(m))
		} else {
			return game.ev.on("mouseDown", (m) => m === mouse && action(m))
		}
	}

	function onMousePress(
		mouse: MouseButton | ((m: MouseButton) => void),
		action?: (m: MouseButton) => void,
	): EventController {
		if (typeof mouse === "function") {
			return game.ev.on("mousePress", (m) => mouse(m))
		} else {
			return game.ev.on("mousePress", (m) => m === mouse && action(m))
		}
	}

	function onMouseRelease(
		mouse: MouseButton | ((m: MouseButton) => void),
		action?: (m: MouseButton) => void,
	): EventController {
		if (typeof mouse === "function") {
			return game.ev.on("mouseRelease", (m) => mouse(m))
		} else {
			return game.ev.on("mouseRelease", (m) => m === mouse && action(m))
		}
	}

	function onMouseMove(f: (pos: Vec2, dpos: Vec2) => void): EventController {
		return game.ev.on("mouseMove", () => f(mousePos(), mouseDeltaPos()))
	}

	function onCharInput(action: (ch: string) => void): EventController {
		return game.ev.on("charInput", action)
	}

	function onTouchStart(f: (pos: Vec2, t: Touch) => void): EventController {
		return game.ev.on("touchStart", f)
	}

	function onTouchMove(f: (pos: Vec2, t: Touch) => void): EventController {
		return game.ev.on("touchMove", f)
	}

	function onTouchEnd(f: (pos: Vec2, t: Touch) => void): EventController {
		return game.ev.on("touchEnd", f)
	}

	function onScroll(action: (delta: Vec2) => void): EventController {
		return game.ev.on("scroll", action)
	}

	function onVirtualButtonDown(btn: VirtualButton, action: () => void): EventController {
		return game.ev.on("virtualButtonDown", (b) => b === btn && action())
	}

	function onVirtualButtonPress(btn: VirtualButton, action: () => void): EventController {
		return game.ev.on("virtualButtonPress", (b) => b === btn && action())
	}

	function onVirtualButtonRelease(btn: VirtualButton, action: () => void): EventController {
		return game.ev.on("virtualButtonRelease", (b) => b === btn && action())
	}

	function onGamepadButtonDown(btn: GamepadButton | ((btn: GamepadButton) => void), action?: (btn: GamepadButton) => void): EventController {
		if (typeof btn === "function") {
			return game.ev.on("gamepadButtonDown", btn)
		} else if (typeof btn === "string" && typeof action === "function") {
			return game.ev.on("gamepadButtonDown", (b) => b === btn && action(btn))
		}
	}

	function onGamepadButtonPress(btn: GamepadButton | ((btn: GamepadButton) => void), action?: (btn: GamepadButton) => void): EventController {
		if (typeof btn === "function") {
			return game.ev.on("gamepadButtonPress", btn)
		} else if (typeof btn === "string" && typeof action === "function") {
			return game.ev.on("gamepadButtonPress", (b) => b === btn && action(btn))
		}
	}

	function onGamepadButtonRelease(btn: GamepadButton | ((btn: GamepadButton) => void), action?: (btn: GamepadButton) => void): EventController {
		if (typeof btn === "function") {
			return game.ev.on("gamepadButtonRelease", btn)
		} else if (typeof btn === "string" && typeof action === "function") {
			return game.ev.on("gamepadButtonRelease", (b) => b === btn && action(btn))
		}
	}

	function onGamepadStick(stick: GamepadStick, action: (value: Vec2) => void): EventController {
		return game.ev.on("gamepadStick", ((a: string, v: Vec2) => a === stick && action(v)))
	}

	function enterDebugMode() {

		onKeyPress("f1", () => {
			debug.inspect = !debug.inspect
		})

		onKeyPress("f2", () => {
			debug.clearLog()
		})

		onKeyPress("f8", () => {
			debug.paused = !debug.paused
		})

		onKeyPress("f7", () => {
			debug.timeScale = toFixed(clamp(debug.timeScale - 0.2, 0, 2), 1)
		})

		onKeyPress("f9", () => {
			debug.timeScale = toFixed(clamp(debug.timeScale + 0.2, 0, 2), 1)
		})

		onKeyPress("f10", () => {
			debug.stepFrame()
		})

	}

	function enterBurpMode() {
		onKeyPress("b", () => burp())
	}

	function setGravity(g: number) {
		game.gravity = g
	}

	function getGravity() {
		return game.gravity
	}

	function setBackground(...args) {
		if (args.length === 1 || args.length === 2) {
			gfx.bgColor = rgb(args[0])
			if (args[1]) gfx.bgAlpha = args[1]
		} else if (args.length === 3 || args.length === 4) {
			gfx.bgColor = rgb(args[0], args[1], args[2])
			if (args[3]) gfx.bgAlpha = args[3]
		}
		gl.clearColor(
			gfx.bgColor.r / 255,
			gfx.bgColor.g / 255,
			gfx.bgColor.b / 255,
			gfx.bgAlpha,
		)
	}

	function getBackground() {
		return gfx.bgColor.clone()
	}

	// TODO: return custom Gamepad type with isButtonPressed(), getStick() methods etc
	// Get connected gamepads
	function getGamepads(): Gamepad[] {
		return navigator.getGamepads().filter((g) => g !== null)
	}

	// TODO: manage global velocity here?
	function pos(...args: Vec2Args): PosComp {

		return {

			id: "pos",
			pos: vec2(...args),

			moveBy(...args: Vec2Args) {
				this.pos = this.pos.add(vec2(...args))
			},

			// move with velocity (pixels per second)
			move(...args: Vec2Args) {
				this.moveBy(vec2(...args).scale(dt()))
			},

			// move to a destination, with optional speed
			moveTo(...args) {
				if (typeof args[0] === "number" && typeof args[1] === "number") {
					return this.moveTo(vec2(args[0], args[1]), args[2])
				}
				const dest = args[0]
				const speed = args[1]
				if (speed === undefined) {
					this.pos = vec2(dest)
					return
				}
				const diff = dest.sub(this.pos)
				if (diff.len() <= speed * dt()) {
					this.pos = vec2(dest)
					return
				}
				this.move(diff.unit().scale(speed))
			},

			worldPos(this: GameObj<PosComp>): Vec2 {
				return this.parent
					? this.parent.transform.multVec2(this.pos)
					: this.pos
			},

			// get the screen position (transformed by camera)
			screenPos(this: GameObj<PosComp | FixedComp>): Vec2 {
				return this.fixed
					? this.pos
					: toScreen(this.pos)
			},

			inspect() {
				return `(${Math.round(this.pos.x)}, ${Math.round(this.pos.y)})`
			},

			drawInspect() {
				drawCircle({
					color: rgb(255, 0, 0),
					radius: 4 / getViewportScale(),
				})
			},

		}

	}

	// TODO: allow single number assignment
	function scale(...args: Vec2Args): ScaleComp {
		if (args.length === 0) {
			return scale(1)
		}
		return {
			id: "scale",
			scale: vec2(...args),
			scaleTo(...args: Vec2Args) {
				this.scale = vec2(...args)
			},
			scaleBy(...args: Vec2Args) {
				this.scale.scale(vec2(...args))
			},
			inspect() {
				return `(${toFixed(this.scale.x, 2)}, ${toFixed(this.scale.y, 2)})`
			},
		}
	}

	function rotate(r: number): RotateComp {
		return {
			id: "rotate",
			angle: r ?? 0,
			rotateBy(angle: number) {
				this.angle += angle
			},
			rotateTo(angle: number) {
				this.angle = angle
			},
			inspect() {
				return `${Math.round(this.angle)}`
			},
		}
	}

	function color(...args): ColorComp {
		return {
			id: "color",
			color: rgb(...args),
			inspect() {
				return this.color.toString()
			},
		}
	}

	function toFixed(n: number, f: number) {
		return Number(n.toFixed(f))
	}

	// TODO: fadeIn here?
	function opacity(a: number): OpacityComp {
		return {
			id: "opacity",
			opacity: a ?? 1,
			inspect() {
				return `${toFixed(this.opacity, 1)}`
			},
			fadeOut(time = 1, easeFunc = easings.linear): TweenController {
				return tween(this.opacity, 0, time, (a) => this.opacity = a, easeFunc)
			},
		}
	}

	function anchor(o: Anchor | Vec2): AnchorComp {
		if (!o) {
			throw new Error("Please define an anchor")
		}
		return {
			id: "anchor",
			anchor: o,
			inspect() {
				if (typeof this.anchor === "string") {
					return this.anchor
				} else {
					return this.anchor.toString()
				}
			},
		}
	}

	function z(z: number): ZComp {
		return {
			id: "z",
			z: z,
			inspect() {
				return `${this.z}`
			},
		}
	}

	function follow(obj: GameObj, offset?: Vec2): FollowComp {
		return {
			id: "follow",
			require: [ "pos" ],
			follow: {
				obj: obj,
				offset: offset ?? vec2(0),
			},
			add(this: GameObj<FollowComp | PosComp>) {
				if (obj.exists()) {
					this.pos = this.follow.obj.pos.add(this.follow.offset)
				}
			},
			update(this: GameObj<FollowComp | PosComp>) {
				if (obj.exists()) {
					this.pos = this.follow.obj.pos.add(this.follow.offset)
				}
			},
		}
	}

	function move(dir: number | Vec2, speed: number): MoveComp {
		const d = typeof dir === "number" ? Vec2.fromAngle(dir) : dir.unit()
		return {
			id: "move",
			require: [ "pos" ],
			update(this: GameObj<PosComp>) {
				this.move(d.scale(speed))
			},
		}
	}

	const DEF_OFFSCREEN_DIS = 200

	function offscreen(opt: OffScreenCompOpt = {}): OffScreenComp {
		const distance = opt.distance ?? DEF_OFFSCREEN_DIS
		let isOut = false
		return {
			id: "offscreen",
			require: [ "pos" ],
			isOffScreen(this: GameObj<PosComp>): boolean {
				const pos = toScreen(this.pos)
				const screenRect = new Rect(vec2(0), width(), height())
				return !testRectPoint(screenRect, pos)
					&& screenRect.sdistToPoint(pos) > distance * distance
			},
			onExitScreen(this: GameObj, action: () => void): EventController {
				return this.on("exitView", action)
			},
			onEnterScreen(this: GameObj, action: () => void): EventController {
				return this.on("enterView", action)
			},
			update(this: GameObj) {
				if (this.isOffScreen()) {
					if (!isOut) {
						this.trigger("exitView")
						isOut = true
					}
					if (opt.hide) this.hidden = true
					if (opt.pause) this.paused = true
					if (opt.destroy) this.destroy()
				} else {
					if (isOut) {
						this.trigger("enterView")
						isOut = false
					}
					if (opt.hide) this.hidden = false
					if (opt.pause) this.paused = false
				}
			},
		}
	}

	function area(opt: AreaCompOpt = {}): AreaComp {

		const events: Array<EventController> = []
		const colliding = {}
		const collidingThisFrame = new Set()

		return {

			id: "area",
			collisionIgnore: opt.collisionIgnore ?? [],

			add(this: GameObj<AreaComp>) {

				if (this.area.cursor) {
					events.push(this.onHover(() => setCursor(this.area.cursor)))
				}

				events.push(this.onCollideUpdate((obj, col) => {
					if (!colliding[obj.id]) {
						this.trigger("collide", obj, col)
					}
					colliding[obj.id] = col
					collidingThisFrame.add(obj.id)
				}))

			},

			update(this: GameObj<AreaComp>) {
				for (const id in colliding) {
					if (!collidingThisFrame.has(Number(id))) {
						this.trigger("collideEnd", colliding[id].target)
						delete colliding[id]
					}
				}
				collidingThisFrame.clear()
			},

			drawInspect(this: GameObj<AreaComp | AnchorComp | FixedComp>) {

				const a = this.localArea()

				pushTransform()
				pushScale(this.area.scale)
				pushTranslate(this.area.offset)

				const opts = {
					outline: {
						width: 4 / getViewportScale(),
						color: rgb(0, 0, 255),
					},
					anchor: this.anchor,
					fill: false,
					fixed: this.fixed,
				}

				if (a instanceof Rect) {
					drawRect({
						...opts,
						pos: a.pos,
						width: a.width,
						height: a.height,
					})
				} else if (a instanceof Polygon) {
					drawPolygon({
						...opts,
						pts: a.pts,
					})
				} else if (a instanceof Circle) {
					drawCircle({
						...opts,
						pos: a.center,
						radius: a.radius,
					})
				}

				popTransform()

			},

			destroy() {
				events.forEach((e) => e.cancel())
			},

			area: {
				shape: opt.shape ?? null,
				scale: opt.scale ? vec2(opt.scale) : vec2(1),
				offset: opt.offset ?? vec2(0),
				cursor: opt.cursor ?? null,
			},

			isClicked(): boolean {
				return isMousePressed() && this.isHovering()
			},

			isHovering(this: GameObj) {
				const mpos = this.fixed ? mousePos() : toWorld(mousePos())
				return this.hasPoint(mpos)
			},

			checkCollision(this: GameObj, other: GameObj<AreaComp>) {
				return colliding[other.id] ?? null
			},

			getCollisions() {
				return Object.values(colliding)
			},

			isColliding(other: GameObj<AreaComp>) {
				return Boolean(colliding[other.id])
			},

			isOverlapping(other) {
				const col = colliding[other.id]
				return col && col.hasOverlap()
			},

			onClick(this: GameObj, f: () => void): EventController {
				return this.onUpdate(() => {
					if (this.isClicked()) {
						f()
					}
				})
			},

			onHover(this: GameObj, action: () => void): EventController {
				let hovering = false
				return this.onUpdate(() => {
					if (!hovering) {
						if (this.isHovering()) {
							hovering = true
							action()
						}
					} else {
						hovering = this.isHovering()
					}
				})
			},

			onHoverUpdate(this: GameObj, onHover: () => void): EventController {
				return this.onUpdate(() => {
					if (this.isHovering()) {
						onHover()
					}
				})
			},

			onHoverEnd(this: GameObj, action: () => void): EventController {
				let hovering = false
				return this.onUpdate(() => {
					if (hovering) {
						if (!this.isHovering()) {
							hovering = false
							action()
						}
					} else {
						hovering = this.isHovering()
					}
				})
			},

			onCollide(
				this: GameObj,
				tag: Tag | ((obj: GameObj, col?: Collision) => void),
				cb?: (obj: GameObj, col?: Collision) => void,
			): EventController {
				if (typeof tag === "function" && cb === undefined) {
					return this.on("collide", tag)
				} else if (typeof tag === "string") {
					return this.onCollide((obj, col) => {
						if (obj.is(tag)) {
							cb(obj, col)
						}
					})
				}
			},

			onCollideUpdate(
				this: GameObj<AreaComp>,
				tag: Tag | ((obj: GameObj, col?: Collision) => void),
				cb?: (obj: GameObj, col?: Collision) => void,
			): EventController {
				if (typeof tag === "function" && cb === undefined) {
					return this.on("collideUpdate", tag)
				} else if (typeof tag === "string") {
					return this.on("collideUpdate", (obj, col) => obj.is(tag) && cb(obj, col))
				}
			},

			onCollideEnd(
				this: GameObj<AreaComp>,
				tag: Tag | ((obj: GameObj) => void),
				cb?: (obj: GameObj) => void,
			): EventController {
				if (typeof tag === "function" && cb === undefined) {
					return this.on("collideEnd", tag)
				} else if (typeof tag === "string") {
					return this.on("collideEnd", (obj) => obj.is(tag) && cb(obj))
				}
			},

			hasPoint(pt: Vec2): boolean {
				// TODO: convert to pt to local space instead
				return testPolygonPoint(this.worldArea(), pt)
			},

			// push an obj out of another if they're overlapped
			resolveCollision(this: GameObj<AreaComp | PosComp>, obj: GameObj<AreaComp>) {
				const col = this.checkCollision(obj)
				if (col && !col.resolved) {
					this.pos = this.pos.add(col.displacement)
					col.resolved = true
				}
			},

			localArea(this: GameObj<AreaComp | { renderArea(): Shape }>): Shape {
				return this.area.shape
					? this.area.shape
					: this.renderArea()
			},

			// TODO: cache
			worldArea(this: GameObj<AreaComp | AnchorComp>): Polygon {

				const localArea = this.localArea()

				if (!(localArea instanceof Polygon || localArea instanceof Rect)) {
					throw new Error("Only support polygon and rect shapes for now")
				}

				const transform = this.transform
					.clone()
					.scale(vec2(this.area.scale ?? 1))
					.translate(this.area.offset)

				if (localArea instanceof Rect) {
					const offset = anchorPt(this.anchor || DEF_ANCHOR)
						.add(1, 1)
						.scale(-0.5)
						.scale(localArea.width, localArea.height)
					transform.translate(offset)
				}

				return localArea.transform(transform) as Polygon

			},

			screenArea(this: GameObj<AreaComp | FixedComp>): Polygon {
				const area = this.worldArea()
				if (this.fixed) {
					return area
				} else {
					return area.transform(game.cam.transform)
				}
			},

		}

	}

	function getRenderProps(obj: GameObj<any>) {
		return {
			color: obj.color,
			opacity: obj.opacity,
			anchor: obj.anchor,
			outline: obj.outline,
			fixed: obj.fixed,
			shader: obj.shader,
			uniform: obj.uniform,
		}
	}

	// TODO: clean
	function sprite(
		src: string | SpriteData | Asset<SpriteData>,
		opt: SpriteCompOpt = {},
	): SpriteComp {

		let spriteData: SpriteData | null = null
		let curAnim: SpriteCurAnim | null = null
		const spriteLoadedEvent = new Event<[SpriteData]>()

		if (!src) {
			throw new Error("Please pass the resource name or data to sprite()")
		}

		const calcTexScale = (tex: Texture, q: Quad, w?: number, h?: number): Vec2 => {
			const scale = vec2(1, 1)
			if (w && h) {
				scale.x = w / (tex.width * q.w)
				scale.y = h / (tex.height * q.h)
			} else if (w) {
				scale.x = w / (tex.width * q.w)
				scale.y = scale.x
			} else if (h) {
				scale.y = h / (tex.height * q.h)
				scale.x = scale.y
			}
			return scale
		}

		return {

			id: "sprite",
			// TODO: allow update
			width: 0,
			height: 0,
			frame: opt.frame || 0,
			quad: opt.quad || new Quad(0, 0, 1, 1),
			animSpeed: opt.animSpeed ?? 1,
			flipX: opt.flipX ?? false,
			flipY: opt.flipY ?? false,

			draw(this: GameObj<SpriteComp>) {

				if (!spriteData) return

				const q = spriteData.frames[this.frame ?? 0]

				if (!q) {
					throw new Error(`Frame not found: ${this.frame ?? 0}`)
				}

				if (spriteData.slice9) {
					// TODO: tile
					// TODO: use scale or width / height, or both?
					const { left, right, top, bottom } = spriteData.slice9
					const tw = spriteData.tex.width * q.w
					const th = spriteData.tex.height * q.h
					const iw = this.width - left - right
					const ih = this.height - top - bottom
					const w1 = left / tw
					const w3 = right / tw
					const w2 = 1 - w1 - w3
					const h1 = top / th
					const h3 = bottom / th
					const h2 = 1 - h1 - h3
					const quads = [
						// uv
						quad(0,       0,       w1, h1),
						quad(w1,      0,       w2, h1),
						quad(w1 + w2, 0,       w3, h1),
						quad(0,       h1,      w1, h2),
						quad(w1,      h1,      w2, h2),
						quad(w1 + w2, h1,      w3, h2),
						quad(0,       h1 + h2, w1, h3),
						quad(w1,      h1 + h2, w2, h3),
						quad(w1 + w2, h1 + h2, w3, h3),
						// transform
						quad(0,         0,        left,  top),
						quad(left,      0,        iw,    top),
						quad(left + iw, 0,        right, top),
						quad(0,         top,      left,  ih),
						quad(left,      top,      iw,    ih),
						quad(left + iw, top,      right, ih),
						quad(0,         top + ih, left,  bottom),
						quad(left,      top + ih, iw,    bottom),
						quad(left + iw, top + ih, right, bottom),
					]
					for (let i = 0; i < 9; i++) {
						const uv = quads[i]
						const transform = quads[i + 9]
						drawTexture(Object.assign(getRenderProps(this), {
							pos: transform.pos(),
							tex: spriteData.tex,
							quad: q.scale(uv),
							flipX: this.flipX,
							flipY: this.flipY,
							tiled: opt.tiled,
							width: transform.w,
							height: transform.h,
						}))
					}

				} else {
					drawTexture(Object.assign(getRenderProps(this), {
						tex: spriteData.tex,
						quad: q,
						flipX: this.flipX,
						flipY: this.flipY,
						tiled: opt.tiled,
						width: this.width,
						height: this.height,
					}))
				}

			},

			update(this: GameObj<SpriteComp>) {

				// TODO: get sprite data in add()
				if (!spriteData) {

					const spr = resolveSprite(src)

					if (!spr || !spr.data) {
						return
					}

					let q = spr.data.frames[0].clone()

					if (opt.quad) {
						q = q.scale(opt.quad)
					}

					const scale = calcTexScale(spr.data.tex, q, opt.width, opt.height)

					this.width = spr.data.tex.width * q.w * scale.x
					this.height = spr.data.tex.height * q.h * scale.y

					if (opt.anim) {
						this.play(opt.anim)
					}

					spriteData = spr.data
					spriteLoadedEvent.trigger(spriteData)

				}

				if (!curAnim) {
					return
				}

				const anim = spriteData.anims[curAnim.name]

				if (typeof anim === "number") {
					this.frame = anim
					return
				}

				if (anim.speed === 0) {
					throw new Error("Sprite anim speed cannot be 0")
				}

				curAnim.timer += dt() * this.animSpeed

				if (curAnim.timer >= (1 / curAnim.speed)) {
					curAnim.timer = 0
					// TODO: clean up
					if (anim.from > anim.to) {
						this.frame--
						if (this.frame < anim.to) {
							if (curAnim.loop) {
								this.frame = anim.from
							} else {
								this.frame++
								curAnim.onEnd()
								this.stop()
							}
						}
					} else {
						this.frame++
						if (this.frame > anim.to) {
							if (curAnim.loop) {
								this.frame = anim.from
							} else {
								this.frame--
								curAnim.onEnd()
								this.stop()
							}
						}
					}
				}

			},

			play(this: GameObj<SpriteComp>, name: string, opt: SpriteAnimPlayOpt = {}) {

				if (!spriteData) {
					spriteLoadedEvent.add(() => this.play(name, opt))
					return
				}

				const anim = spriteData.anims[name]

				if (!anim) {
					throw new Error(`Anim not found: ${name}`)
				}

				if (curAnim) {
					this.stop()
				}

				curAnim = typeof anim === "number"
					? {
						name: name,
						timer: 0,
						loop: false,
						pingpong: false,
						speed: 0,
						onEnd: () => {},
					}
					: {
						name: name,
						timer: 0,
						loop: opt.loop ?? anim.loop ?? false,
						pingpong: opt.pingpong ?? anim.pingpong ?? false,
						speed: opt.speed ?? anim.speed ?? 10,
						onEnd: opt.onEnd ?? (() => {}),
					}

				this.frame = typeof anim === "number"
					? anim
					: anim.from

				this.trigger("animStart", name)

			},

			stop(this: GameObj<SpriteComp>) {
				if (!curAnim) {
					return
				}
				const prevAnim = curAnim.name
				curAnim = null
				this.trigger("animEnd", prevAnim)
			},

			numFrames() {
				return spriteData?.frames.length ?? 0
			},

			curAnim() {
				return curAnim?.name
			},

			onAnimEnd(
				this: GameObj<SpriteComp>,
				action: (name: string) => void,
			): EventController {
				return this.on("animEnd", action)
			},

			onAnimStart(
				this: GameObj<SpriteComp>,
				action: (name: string) => void,
			): EventController {
				return this.on("animStart", action)
			},

			renderArea() {
				return new Rect(vec2(0), this.width, this.height)
			},

			inspect() {
				if (typeof src === "string") {
					return `"${src}"`
				}
			},

		}

	}

	function text(t: string, opt: TextCompOpt = {}): TextComp {

		function update(obj: GameObj<TextComp | any>) {

			const ftext = formatText(Object.assign(getRenderProps(obj), {
				text: obj.text + "",
				size: obj.textSize,
				font: obj.font,
				width: opt.width && obj.width,
				align: obj.align,
				letterSpacing: obj.letterSpacing,
				lineSpacing: obj.lineSpacing,
				transform: obj.textTransform,
				styles: obj.textStyles,
			}))

			if (!opt.width) {
				obj.width = ftext.width / (obj.scale?.x || 1)
			}

			obj.height = ftext.height / (obj.scale?.y || 1)

			return ftext

		}

		return {

			id: "text",
			text: t,
			textSize: opt.size ?? DEF_TEXT_SIZE,
			font: opt.font,
			width: opt.width,
			height: 0,
			align: opt.align,
			lineSpacing: opt.lineSpacing,
			letterSpacing: opt.letterSpacing,
			textTransform: opt.transform,
			textStyles: opt.styles,

			add(this: GameObj<TextComp>) {
				onLoad(() => update(this))
			},

			draw(this: GameObj<TextComp>) {
				drawFormattedText(update(this))
			},

			renderArea() {
				return new Rect(vec2(0), this.width, this.height)
			},

		}

	}

	function rect(w: number, h: number, opt: RectCompOpt = {}): RectComp {
		return {
			id: "rect",
			width: w,
			height: h,
			radius: opt.radius || 0,
			draw(this: GameObj<RectComp>) {
				drawRect(Object.assign(getRenderProps(this), {
					width: this.width,
					height: this.height,
					radius: this.radius,
				}))
			},
			renderArea() {
				return new Rect(vec2(0), this.width, this.height)
			},
			inspect() {
				return `${Math.ceil(this.width)}, ${Math.ceil(this.height)}`
			},
		}
	}

	function uvquad(w: number, h: number): UVQuadComp {
		return {
			id: "rect",
			width: w,
			height: h,
			draw(this: GameObj<UVQuadComp>) {
				drawUVQuad(Object.assign(getRenderProps(this), {
					width: this.width,
					height: this.height,
				}))
			},
			renderArea() {
				return new Rect(vec2(0), this.width, this.height)
			},
			inspect() {
				return `${Math.ceil(this.width)}, ${Math.ceil(this.height)}`
			},
		}
	}

	function circle(radius: number): CircleComp {
		return {
			id: "circle",
			radius: radius,
			draw(this: GameObj<CircleComp>) {
				drawCircle(Object.assign(getRenderProps(this), {
					radius: this.radius,
				}))
			},
			renderArea(this: GameObj<AnchorComp | CircleComp>) {
				return new Rect(new Vec2(this.anchor ? 0 : -this.radius), this.radius * 2, this.radius * 2)
			},
			inspect() {
				return `${Math.ceil(this.radius)}`
			},
		}
	}

	function outline(width: number = 1, color: Color = rgb(0, 0, 0)): OutlineComp {
		return {
			id: "outline",
			outline: {
				width,
				color,
			},
		}
	}

	function timer(time?: number, action?: () => void): TimerComp {
		const timers: IDList<Timer> = new IDList()
		if (time && action) {
			timers.pushd(new Timer(time, action))
		}
		return {
			id: "timer",
			wait(time: number, action: () => void): TimerController {
				const actions = [ action ]
				const timer = new Timer(time, () => actions.forEach((f) => f()))
				const cancel = timers.pushd(timer)
				return {
					get paused() {
						return timer.paused
					},
					set paused(p) {
						timer.paused = p
					},
					cancel: cancel,
					onEnd(action) {
						actions.push(action)
					},
					then(action) {
						this.onEnd(action)
						return this
					},
				}
			},
			update() {
				timers.forEach((timer, id) => {
					if (timer.tick(dt())) {
						timers.delete(id)
					}
				})
			},
		}
	}

	// maximum y velocity with body()
	const DEF_JUMP_FORCE = 640
	const MAX_VEL = 65536

	// TODO: land on wall
	function body(opt: BodyCompOpt = {}): BodyComp {

		const vel = vec2(0)
		let curPlatform: GameObj<PosComp | AreaComp | BodyComp> | null = null
		let lastPlatformPos = null
		let wantFall = false
		const events: Array<EventController> = []

		return {

			id: "body",
			require: [ "pos", "area" ],
			jumpForce: opt.jumpForce ?? DEF_JUMP_FORCE,
			gravityScale: opt.gravityScale ?? 1,
			isStatic: opt.isStatic ?? false,
			// TODO: prefer density * area()
			mass: opt.mass ?? 1,

			add(this: GameObj<PosComp | BodyComp | AreaComp>) {

				if (this.mass === 0) {
					throw new Error("Can't set body mass to 0")
				}

				// TODO
				// static vs static: don't resolve
				// static vs non-static: always resolve non-static
				// non-static vs non-static: resolve the first one
				events.push(this.onCollideUpdate((other: GameObj<PosComp | BodyComp>, col) => {

					if (!other.is("body")) {
						return
					}

					if (col.resolved) {
						return
					}

					this.trigger("beforePhysicsResolve", col)
					other.trigger("beforePhysicsResolve", col.reverse())

					// user can mark 'resolved' in beforePhysicsResolve to stop a resolution
					if (col.resolved) {
						return
					}

					if (this.isStatic && other.isStatic) {
						return
					} else if (!this.isStatic && !other.isStatic) {
						// TODO: update all children transform?
						const tmass = this.mass + other.mass
						this.pos = this.pos.add(col.displacement.scale(other.mass / tmass))
						other.pos = other.pos.add(col.displacement.scale(-this.mass / tmass))
						this.transform = calcTransform(this)
						other.transform = calcTransform(other)
					} else {
						// if one is static and on is not, resolve the non static one
						const col2 = (!this.isStatic && other.isStatic) ? col : col.reverse()
						col2.source.pos = col2.source.pos.add(col2.displacement)
						col2.source.transform = calcTransform(col2.source)
					}

					col.resolved = true
					this.trigger("physicsResolve", col)
					other.trigger("physicsResolve", col.reverse())

				}))

				events.push(this.onPhysicsResolve((col) => {
					if (game.gravity) {
						if (col.isBottom() && this.isFalling()) {
							vel.y = 0
							curPlatform = col.target as GameObj<PosComp | BodyComp | AreaComp>
							lastPlatformPos = col.target.pos
							if (wantFall) {
								wantFall = false
							} else {
								this.trigger("ground", curPlatform)
							}
						} else if (col.isTop() && this.isJumping()) {
							vel.y = 0
							this.trigger("headbutt", col.target)
						}
					}
				}))

			},

			update(this: GameObj<PosComp | BodyComp | AreaComp>) {

				if (!game.gravity) {
					return
				}

				if (this.isStatic) {
					return
				}

				if (wantFall) {
					curPlatform = null
					lastPlatformPos = null
					this.trigger("fallOff")
					wantFall = false
				}

				if (curPlatform) {
					if (
						!this.isColliding(curPlatform)
						|| !curPlatform.exists()
						|| !curPlatform.is("body")
					) {
						wantFall = true
					} else {
						if (
							!curPlatform.pos.eq(lastPlatformPos)
							&& opt.stickToPlatform !== false
						) {
							this.moveBy(curPlatform.pos.sub(lastPlatformPos))
						}
						lastPlatformPos = curPlatform.pos
						return
					}
				}

				const prevVelY = vel.y
				vel.y += game.gravity * this.gravityScale * dt()
				vel.y = Math.min(vel.y, opt.maxVelocity ?? MAX_VEL)
				if (prevVelY < 0 && vel.y >= 0) {
					this.trigger("fall")
				}
				this.move(vel)

			},

			destroy() {
				events.forEach((e) => e.cancel())
			},

			onPhysicsResolve(this: GameObj, action) {
				return this.on("physicsResolve", action)
			},

			onBeforePhysicsResolve(this: GameObj, action) {
				return this.on("beforePhysicsResolve", action)
			},

			curPlatform(): GameObj | null {
				return curPlatform
			},

			isGrounded() {
				return curPlatform !== null
			},

			isFalling(): boolean {
				return vel.y > 0
			},

			isJumping(): boolean {
				return vel.y < 0
			},

			jump(force: number) {
				curPlatform = null
				lastPlatformPos = null
				vel.y = -force || -this.jumpForce
			},

			onGround(this: GameObj, action: () => void): EventController {
				return this.on("ground", action)
			},

			onFall(this: GameObj, action: () => void): EventController {
				return this.on("fall", action)
			},

			onFallOff(this: GameObj, action: () => void): EventController {
				return this.on("fallOff", action)
			},

			onHeadbutt(this: GameObj, action: () => void): EventController {
				return this.on("headbutt", action)
			},

		}

	}

	function doubleJump(numJumps: number = 2): DoubleJumpComp {
		let jumpsLeft = numJumps
		const events = []
		return {
			id: "doubleJump",
			require: [ "body" ],
			numJumps: numJumps,
			add(this: GameObj<BodyComp | DoubleJumpComp>) {
				events.push(this.onGround(() => {
					jumpsLeft = this.numJumps
				}))
			},
			destroy() {
				events.forEach((e) => e.cancel())
			},
			doubleJump(this: GameObj<BodyComp | DoubleJumpComp>, force?: number) {
				if (jumpsLeft <= 0) {
					return
				}
				if (jumpsLeft < this.numJumps) {
					this.trigger("doubleJump")
				}
				jumpsLeft--
				this.jump(force)
			},
			onDoubleJump(this: GameObj, action: () => void): EventController {
				return this.on("doubleJump", action)
			},
			inspect(this: GameObj<BodyComp | DoubleJumpComp>) {
				return `${jumpsLeft}`
			},
		}
	}

	function shader(id: string, uniform?: Uniform | (() => Uniform)): ShaderComp {
		return {
			id: "shader",
			shader: id,
			...(typeof uniform === "function" ? {
				uniform: uniform(),
				update() {
					this.uniform = uniform()
				},
			} : {
				uniform: uniform,
			}),
		}
	}

	// TODO: all children should be fixed
	function fixed(): FixedComp {
		return {
			id: "fixed",
			fixed: true,
		}
	}

	function stay(scenesToStay?: string[]): StayComp {
		return {
			id: "stay",
			stay: true,
			scenesToStay: scenesToStay,
		}
	}

	function health(hp: number): HealthComp {
		if (hp == null) {
			throw new Error("health() requires the initial amount of hp")
		}
		return {
			id: "health",
			hurt(this: GameObj, n: number = 1) {
				this.setHP(hp - n)
				this.trigger("hurt")
			},
			heal(this: GameObj, n: number = 1) {
				this.setHP(hp + n)
				this.trigger("heal")
			},
			hp(): number {
				return hp
			},
			setHP(this: GameObj, n: number) {
				hp = n
				if (hp <= 0) {
					this.trigger("death")
				}
			},
			onHurt(this: GameObj, action: () => void): EventController {
				return this.on("hurt", action)
			},
			onHeal(this: GameObj, action: () => void): EventController {
				return this.on("heal", action)
			},
			onDeath(this: GameObj, action: () => void): EventController {
				return this.on("death", action)
			},
			inspect() {
				return `${hp}`
			},
		}
	}

	function lifespan(time: number, opt: LifespanCompOpt = {}): LifespanComp {
		if (time == null) {
			throw new Error("lifespan() requires time")
		}
		const fade = opt.fade ?? 0
		return {
			id: "lifespan",
			async add(this: GameObj<OpacityComp>) {
				await wait(time)
				// TODO: this secretively requires opacity comp, make opacity on every game obj?
				if (fade > 0 && this.opacity) {
					await tween(this.opacity, 0, fade, (a) => this.opacity = a, easings.linear)
				}
				this.destroy()
			},
		}
	}

	function state(
		initState: string,
		stateList?: string[],
		transitions?: Record<string, string | string[]>,
	): StateComp {

		if (!initState) {
			throw new Error("state() requires an initial state")
		}

		const events = {}

		function initStateEvents(state: string) {
			if (!events[state]) {
				events[state] = {
					enter: new Event(),
					end: new Event(),
					update: new Event(),
					draw: new Event(),
				}
			}
		}

		function on(event, state, action) {
			initStateEvents(state)
			return events[state][event].add(action)
		}

		function trigger(event, state, ...args) {
			initStateEvents(state)
			events[state][event].trigger(...args)
		}

		let didFirstEnter = false

		return {

			id: "state",
			state: initState,

			enterState(state: string, ...args) {

				didFirstEnter = true

				if (stateList && !stateList.includes(state)) {
					throw new Error(`State not found: ${state}`)
				}

				const oldState = this.state

				if (transitions) {

					// check if the transition is legal, if transition graph is defined
					if (!transitions?.[oldState]) {
						return
					}

					const available = typeof transitions[oldState] === "string"
						? [transitions[oldState]]
						: transitions[oldState] as string[]

					if (!available.includes(state)) {
						throw new Error(`Cannot transition state from "${oldState}" to "${state}". Available transitions: ${available.map((s) => `"${s}"`).join(", ")}`)
					}

				}

				trigger("end", oldState, ...args)
				this.state = state
				trigger("enter", state, ...args)
				trigger("enter", `${oldState} -> ${state}`, ...args)

			},

			onStateTransition(from: string, to: string, action: () => void): EventController {
				return on("enter", `${from} -> ${to}`, action)
			},

			onStateEnter(state: string, action: () => void): EventController {
				return on("enter", state, action)
			},

			onStateUpdate(state: string, action: () => void): EventController {
				return on("update", state, action)
			},

			onStateDraw(state: string, action: () => void): EventController {
				return on("draw", state, action)
			},

			onStateEnd(state: string, action: () => void): EventController {
				return on("end", state, action)
			},

			update() {
			// execute the enter event for initState
				if (!didFirstEnter) {
					trigger("enter", initState)
					didFirstEnter = true
				}
				trigger("update", this.state)
			},

			draw() {
				trigger("draw", this.state)
			},

			inspect() {
				return this.state
			},

		}

	}

	function fadeIn(time: number = 1): Comp {
		let t = 0
		let done = false
		return {
			require: [ "opacity" ],
			add(this: GameObj<OpacityComp>) {
				this.opacity = 0
			},
			update(this: GameObj<OpacityComp>) {
				if (done) return
				t += dt()
				this.opacity = map(t, 0, time, 0, 1)
				if (t >= time) {
					this.opacity = 1
					done = true
				}
			},
		}
	}

	function onLoad(cb: () => void): void {
		if (assets.loaded) {
			cb()
		} else {
			game.ev.on("load", cb)
		}
	}

	function scene(id: SceneID, def: SceneDef) {
		game.scenes[id] = def
	}

	function go(id: SceneID, ...args) {

		if (!game.scenes[id]) {
			throw new Error(`Scene not found: ${id}`)
		}

		game.ev.onOnce("frameEnd", () => {

			game.ev = new EventHandler()
			game.objEvents = new EventHandler()

			;[...game.root.children].forEach((obj) => {
				if (
					!obj.stay
					|| (obj.scenesToStay && !obj.scenesToStay.includes(id))
				) {
					game.root.remove(obj)
				}
			})

			game.root.clearEvents()

			// cam
			game.cam = {
				pos: null,
				scale: vec2(1),
				angle: 0,
				shake: 0,
				transform: new Mat4(),
			}

			game.scenes[id](...args)

			if (gopt.debug !== false) {
				enterDebugMode()
			}

			if (gopt.burp) {
				enterBurpMode()
			}

		})

	}

	function getData<T>(key: string, def?: T): T {
		try {
			return JSON.parse(window.localStorage[key])
		} catch {
			if (def) {
				setData(key, def)
				return def
			} else {
				return null
			}
		}
	}

	function setData(key: string, data: any) {
		window.localStorage[key] = JSON.stringify(data)
	}

	function plug<T>(plugin: KaboomPlugin<T>): MergeObj<T> & KaboomCtx {
		const funcs = plugin(ctx)
		for (const k in funcs) {
			// @ts-ignore
			ctx[k] = funcs[k]
			if (gopt.global !== false) {
				// @ts-ignore
				window[k] = funcs[k]
			}
		}
		return ctx as unknown as MergeObj<T> & KaboomCtx
	}

	function center(): Vec2 {
		return vec2(width() / 2, height() / 2)
	}

	enum EdgeMask {
		None = 0,
		Left = 1,
		Top = 2,
		LeftTop = 3,
		Right = 4,
		Horizontal = 5,
		RightTop = 6,
		HorizontalTop = 7,
		Bottom = 8,
		LeftBottom = 9,
		Vertical = 10,
		LeftVertical = 11,
		RightBottom = 12,
		HorizontalBottom = 13,
		RightVertical = 14,
		All = 15,
	}

	function tile(opts: TileCompOpt = {}): TileComp {

		let tilePos = vec2(0)
		let isObstacle = opts.isObstacle ?? false
		let cost = opts.cost ?? 0
		let edges = opts.edges ?? []

		const getEdgeMask = () => {
			const loopup = {
				"left": EdgeMask.Left,
				"top": EdgeMask.Top,
				"right": EdgeMask.Right,
				"bottom": EdgeMask.Bottom,
			}
			return edges.map(s => loopup[s] || 0).reduce((mask, dir) => mask | dir, 0)
		}

		let edgeMask = getEdgeMask()

		return {

			id: "tile",
			tilePosOffset: opts.offset ?? vec2(0),

			set tilePos(p: Vec2) {
				const level = this.getLevel()
				tilePos = p.clone()
				// @ts-ignore
				this.pos = vec2(
					this.tilePos.x * level.tileWidth(),
					this.tilePos.y * level.tileHeight(),
				).add(this.tilePosOffset)
			},

			get tilePos() {
				return tilePos
			},

			set isObstacle(is: boolean) {
				if (isObstacle === is) return
				isObstacle = is
				this.getLevel().invalidateNavigationMap()
			},

			get isObstacle() {
				return isObstacle
			},

			set cost(n: number) {
				if (cost === n) return
				cost = n
				this.getLevel().invalidateNavigationMap()
			},

			get cost() {
				return cost
			},

			set edges(e: Edge[]) {
				edges = e
				edgeMask = getEdgeMask()
				this.getLevel().invalidateNavigationMap()
			},

			get edges() {
				return edges
			},

			get edgeMask() {
				return edgeMask
			},

			getLevel(this: GameObj) {
				return this.parent as GameObj<LevelComp>
			},

			moveLeft() {
				this.tilePos = this.tilePos.add(vec2(-1, 0))
			},

			moveRight() {
				this.tilePos = this.tilePos.add(vec2(1, 0))
			},

			moveUp() {
				this.tilePos = this.tilePos.add(vec2(0, -1))
			},

			moveDown() {
				this.tilePos = this.tilePos.add(vec2(0, 1))
			},

		}

	}

	function addLevel(map: string[], opt: LevelOpt): GameObj<PosComp | LevelComp> {

		if (!opt.tileWidth || !opt.tileHeight) {
			throw new Error("Must provide tileWidth and tileHeight.")
		}

		const level = add([
			pos(opt.pos ?? vec2(0)),
		]) as GameObj<PosComp | LevelComp>

		const numRows = map.length
		let numColumns = 0

		// The spatial map keeps track of the objects at each location
		let spatialMap: GameObj[][] | null = null
		let costMap: number[] | null = null
		let edgeMap: number[] | null = null
		let connectivityMap: number[] | null = null

		const tile2Hash = (tilePos: Vec2) => tilePos.x + tilePos.y * numColumns
		const hash2Tile = (hash: number) => vec2(
			Math.floor(hash % numColumns),
			Math.floor(hash / numColumns),
		)

		const createSpatialMap = () => {
			spatialMap = []
			for (const child of level.children) {
				insertIntoSpatialMap(child)
			}
		}

		const insertIntoSpatialMap = (obj: GameObj) => {
			const i = tile2Hash(obj.tilePos)
			if (spatialMap[i]) {
				spatialMap[i].push(obj)
			} else {
				spatialMap[i] = [obj]
			}
		}

		const removeFromSpatialMap = (obj: GameObj) => {
			const i = tile2Hash(obj.tilePos)
			if (spatialMap[i]) {
				const index = spatialMap[i].indexOf(obj)
				if (index >= 0) {
					spatialMap[i].splice(index, 1)
				}
			}
		}

		const updateSpatialMap = () => {
			let spatialMapChanged = false
			for (const child of level.children) {
				const tilePos = level.pos2Tile(child.pos)
				if (child.tilePos.x != tilePos.x || child.tilePos.y != tilePos.y) {
					spatialMapChanged = true
					removeFromSpatialMap(child)
					child.tilePos.x = tilePos.x
					child.tilePos.y = tilePos.y
					insertIntoSpatialMap(child)
				}
			}
			if (spatialMapChanged) {
				level.trigger("spatial_map_changed")
			}
		}

		// The obstacle map tells which tiles are accessible
		// Cost: accessible with cost
		// Infinite: inaccessible
		const createCostMap = () => {
			const spatialMap = level.getSpatialMap()
			const size = level.numRows() * level.numColumns()
			if (!costMap) {
				costMap = new Array<number>(size)
			}
			else {
				costMap.length = size
			}
			costMap.fill(1, 0, size)
			for (let i = 0; i < spatialMap.length; i++) {
				const objects = spatialMap[i]
				if (objects) {
					let cost = 0
					for (const obj of objects) {
						if (obj.isObstacle) {
							cost = Infinity
							break
						} else {
							cost += obj.cost
						}
					}
					costMap[i] = cost || 1
				}
			}
		}

		// The edge map tells which edges between nodes are walkable
		const createEdgeMap = () => {
			const spatialMap = level.getSpatialMap()
			const size = level.numRows() * level.numColumns()
			if (!edgeMap) {
				edgeMap = new Array<number>(size)
			}
			else {
				edgeMap.length = size
			}
			edgeMap.fill(EdgeMask.All, 0, size)
			for (let i = 0; i < spatialMap.length; i++) {
				const objects = spatialMap[i]
				if (objects) {
					const len = objects.length
					let mask = EdgeMask.All
					for (let j = 0; j < len; j++) {
						mask |= objects[j].edgeMask
					}
					edgeMap[i] = mask
				}
			}
		}

		// The connectivity map is used to see whether two locations are connected
		// -1: inaccesible n: connectivity group
		const createConnectivityMap = () => {
			const size = level.numRows() * level.numColumns()
			const traverse = (i: number, index: number) => {
				const frontier: number[] = []
				frontier.push(i)
				while (frontier.length > 0) {
					const i = frontier.pop()
					getNeighbours(i).forEach((i) => {
						if (connectivityMap[i] < 0) {
							connectivityMap[i] = index
							frontier.push(i)
						}
					})
				}
			}
			if (!connectivityMap) {
				connectivityMap = new Array<number>(size)
			}
			else {
				connectivityMap.length = size
			}
			connectivityMap.fill(-1, 0, size)
			let index = 0
			for (let i = 0; i < costMap.length; i++) {
				if (connectivityMap[i] >= 0) { index++; continue }
				traverse(i, index)
				index++
			}
		}

		const getCost = (node: number, neighbour: number) => {
			// Cost of destination tile
			return costMap[neighbour]
		}

		const getHeuristic = (node: number, goal: number) => {
			// Euclidian distance to target
			const p1 = hash2Tile(node)
			const p2 = hash2Tile(goal)
			return p1.dist(p2)
		}

		const getNeighbours = (node: number, diagonals?: boolean) => {
			const n = []
			const x = Math.floor(node % numColumns)
			const left = x > 0 &&
				(edgeMap[node] & EdgeMask.Left) &&
				costMap[node - 1] !== Infinity
			const top = node >= numColumns &&
				(edgeMap[node] & EdgeMask.Top) &&
				costMap[node - numColumns] !== Infinity
			const right = x < numColumns - 1 &&
				(edgeMap[node] & EdgeMask.Right) &&
				costMap[node + 1] !== Infinity
			const bottom = node < numColumns * numRows - numColumns - 1 &&
				(edgeMap[node] & EdgeMask.Bottom) &&
				costMap[node + numColumns] !== Infinity
			if (diagonals) {
				if (left) {
					if (top) { n.push(node - numColumns - 1) }
					n.push(node - 1)
					if (bottom) { n.push(node + numColumns - 1) }
				}
				if (top) {
					n.push(node - numColumns)
				}
				if (right) {
					if (top) { n.push(node - numColumns + 1) }
					n.push(node + 1)
					if (bottom) { n.push(node + numColumns + 1) }
				}
				if (bottom) {
					n.push(node + numColumns)
				}
			} else {
				if (left) {
					n.push(node - 1)
				}
				if (top) {
					n.push(node - numColumns)
				}
				if (right) {
					n.push(node + 1)
				}
				if (bottom) {
					n.push(node + numColumns)
				}
			}
			return n
		}

		const levelComp: LevelComp = {

			id: "level",

			tileWidth() {
				return opt.tileWidth
			},

			tileHeight() {
				return opt.tileHeight
			},

			spawn(this: GameObj<LevelComp>, key: string | CompList<any>, ...args: Vec2Args): GameObj | null {

				const p = vec2(...args)

				const comps = (() => {
					if (typeof key === "string") {
						if (opt.tiles[key]) {
							if (typeof opt.tiles[key] !== "function") {
								throw new Error("Level symbol def must be a function returning a component list")
							}
							return opt.tiles[key](p)
						} else if (opt.wildcardTile) {
							return opt.wildcardTile(key, p)
						}
					} else if (Array.isArray(key)) {
						return key
					} else {
						throw new Error("Expected a symbol or a component list")
					}
				})()

				// empty tile
				if (!comps) {
					return null
				}

				let hasPos = false
				let hasTile = false

				for (const comp of comps) {
					if (comp.id === "tile") hasTile = true
					if (comp.id === "pos") hasPos = true
				}

				if (!hasPos) comps.push(pos())
				if (!hasTile) comps.push(tile())

				const obj = level.add(comps)

				if (hasPos) {
					obj.tilePosOffset = obj.pos.clone()
				}

				obj.tilePos = p

				if (spatialMap) {
					insertIntoSpatialMap(obj)
					this.trigger("spatial_map_changed")
					this.trigger("navigation_map_invalid")
				}

				return obj

			},

			numColumns() {
				return numColumns
			},

			numRows() {
				return numRows
			},

			levelWidth() {
				return numColumns * this.tileWidth()
			},

			levelHeight() {
				return numRows * this.tileHeight()
			},

			tile2Pos(...args: Vec2Args) {
				return vec2(...args).scale(this.tileWidth(), this.tileHeight())
			},

			pos2Tile(...args: Vec2Args) {
				const p = vec2(...args)
				return vec2(
					Math.floor(p.x / this.tileWidth()),
					Math.floor(p.y / this.tileHeight()),
				)
			},

			getSpatialMap() {
				if (!spatialMap) {
					createSpatialMap()
				}
				return spatialMap
			},

			onSpatialMapChanged(this: GameObj<LevelComp>, cb: () => void) {
				return this.on("spatial_map_changed", cb)
			},

			onNavigationMapInvalid(this: GameObj<LevelComp>, cb: () => void) {
				return this.on("navigation_map_invalid", cb)
			},

			getAt(tilePos: Vec2) {
				if (!spatialMap) {
					createSpatialMap()
				}
				const hash = tile2Hash(tilePos)
				return spatialMap[hash] || []
			},

			update() {
				if (spatialMap) {
					updateSpatialMap()
				}
			},

			invalidateNavigationMap() {
				costMap = null
				edgeMap = null
				connectivityMap = null
			},

			onNavigationMapChanged(this: GameObj<LevelComp>, cb: () => void) {
				return this.on("navigation_map_changed", cb)
			},

			getTilePath(this: GameObj<LevelComp>, from: Vec2, to: Vec2, opts: PathFindOpt = {}) {
				if (!costMap) {
					createCostMap()
				}
				if (!edgeMap) {
					createEdgeMap()
				}
				if (!connectivityMap) {
					createConnectivityMap()
				}

				// Tiles are outside the grid
				if (from.x < 0 || from.x >= numColumns ||
					from.y < 0 || from.y >= numRows) {
					return null
				}
				if (to.x < 0 || to.x >= numColumns ||
					to.y < 0 || to.y >= numRows) {
					return null
				}

				const start = tile2Hash(from)
				const goal = tile2Hash(to)

				// Tiles are not accessible
				// If we test the start tile, we may get stuck
				/*if (costMap[start] === Infinity) {
					return null
				}*/
				if (costMap[goal] === Infinity) {
					return null
				}

				// Same Tile, no waypoints needed
				if (start === goal) {
					return []
				}

				// Tiles are not within the same section
				// If we test the start tile when invalid, we may get stuck
				if (connectivityMap[start] != -1 && connectivityMap[start] !== connectivityMap[goal]) {
					return null
				}

				// Find a path
				interface CostNode { cost: number, node: number }
				const frontier = new BinaryHeap<CostNode>((a, b) => a.cost < b.cost)
				frontier.insert({ cost: 0, node: start })

				const cameFrom = new Map<number, number>()
				cameFrom.set(start, start)
				const costSoFar = new Map<number, number>()
				costSoFar.set(start, 0)

				while (frontier.length !== 0) {
					const current = frontier.remove()?.node

					if (current === goal)
						break

					const neighbours = getNeighbours(current, opts.allowDiagonals)
					for (const next of neighbours) {
						const newCost = (costSoFar.get(current) || 0) +
							getCost(current, next) +
							getHeuristic(next, goal)
						if (!costSoFar.has(next) || newCost < costSoFar.get(next)) {
							costSoFar.set(next, newCost)
							frontier.insert({ cost: newCost, node: next })
							cameFrom.set(next, current)
						}
					}
				}

				const path = []
				let node = goal
				const p = hash2Tile(node)
				path.push(p)
				while (node !== start) {
					node = cameFrom.get(node)
					const p = hash2Tile(node)
					path.push(p)
				}
				return path.reverse()
			},

			getPath(this: GameObj<LevelComp>, from: Vec2, to: Vec2, opts: PathFindOpt = {}) {
				const tw = this.tileWidth()
				const th = this.tileHeight()
				const path = this.getTilePath(
					this.pos2Tile(from),
					this.pos2Tile(to),
					opts,
				)
				if (path) {
					return [
						from,
						...path
							.slice(1, -1)
							.map((tilePos) => tilePos.scale(tw, th).add(tw / 2, th / 2)),
						to,
					]
				}
				else {
					return null
				}
			},

		}

		level.use(levelComp)

		level.onNavigationMapInvalid(() => {
			level.invalidateNavigationMap()
			level.trigger("navigation_map_changed")
		})

		map.forEach((row, i) => {
			const keys = row.split("")
			numColumns = Math.max(keys.length, numColumns)
			keys.forEach((key, j) => {
				level.spawn(key, vec2(j, i))
			})
		})

		return level

	}

	function agent(opts: AgentCompOpt = {}) : AgentComp {
		let target: Vec2 | null = null
		let path: Vec2[] | null = null
		let index: number | null = null
		let navMapChangedEvent: EventController | null = null
		return {
			id: "agent",
			require: ["pos", "tile"],
			agentSpeed: opts.speed ?? 100,
			allowDiagonals: opts.allowDiagonals ?? true,
			getDistanceToTarget(this: GameObj<AgentComp | PosComp>) {
				return target ? this.pos.dist(target) : 0
			},
			getNextLocation() {
				return path && index ? path[index] : null
			},
			getPath() {
				return path ? path.slice() : null
			},
			getTarget() {
				return target
			},
			isNavigationFinished() {
				return path ? index === null : true
			},
			isTargetReachable() {
				return path !== null
			},
			isTargetReached(this: GameObj<AgentComp | PosComp>) {
				return target ? this.pos.eq(target) : true
			},
			setTarget(this: GameObj<AgentComp | TileComp | PosComp>, p: Vec2) {
				target = p
				path = this.getLevel().getPath(this.pos, target, {
					allowDiagonals: this.allowDiagonals,
				})
				index = path ? 0 : null
				if (path) {
					if (!navMapChangedEvent) {
						navMapChangedEvent = this.getLevel().onNavigationMapChanged(() => {
							if (path && index !== null) {
								path = this.getLevel().getPath(this.pos, target, {
									allowDiagonals: this.allowDiagonals,
								})
								index = path ? 0 : null
								if (path) {
									this.trigger("navigation-next", this, path[index])
								} else {
									this.trigger("navigation-ended", this)
								}
							}
						})
						this.onDestroy(() => navMapChangedEvent.cancel())
					}
					this.trigger("navigation-started", this)
					this.trigger("navigation-next", this, path[index])
				} else {
					this.trigger("navigation-ended", this)
				}
			},
			update(this: GameObj<AgentComp | PosComp>) {
				if (path && index !== null) {
					if (this.pos.sdist(path[index]) < 2) {
						if (index === path.length - 1) {
							this.pos = target.clone()
							index = null
							this.trigger("navigation-ended", this)
							this.trigger("target-reached", this)
							return
						} else {
							index++
							this.trigger("navigation-next", this, path[index])
						}

					}
					this.moveTo(path[index], this.agentSpeed)
				}
			},
			onNavigationStarted(this: GameObj<AgentComp>, cb: () => void) {
				return this.on("navigation-started", cb)
			},
			onNavigationNext(this: GameObj<AgentComp>, cb: () => void) {
				return this.on("navigation-next", cb)
			},
			onNavigationEnded(this: GameObj<AgentComp>, cb: () => void) {
				return this.on("navigation-ended", cb)
			},
			onTargetReached(this: GameObj<AgentComp>, cb: () => void) {
				return this.on("target-reached", cb)
			},
			inspect() {
				return JSON.stringify({
					target: JSON.stringify(target),
					path: JSON.stringify(path),
				})
			},
		}
	}

	function record(frameRate?): Recording {

		const stream = app.canvas.captureStream(frameRate)
		const audioDest = audio.ctx.createMediaStreamDestination()

		audio.masterNode.connect(audioDest)

		// TODO: Enabling audio results in empty video if no audio received
		// const audioStream = audioDest.stream
		// const [firstAudioTrack] = audioStream.getAudioTracks()

		// stream.addTrack(firstAudioTrack);

		const recorder = new MediaRecorder(stream)
		const chunks = []

		recorder.ondataavailable = (e) => {
			if (e.data.size > 0) {
				chunks.push(e.data)
			}
		}

		recorder.onerror = () => {
			audio.masterNode.disconnect(audioDest)
			stream.getTracks().forEach(t => t.stop())
		}

		recorder.start()

		return {

			resume() {
				recorder.resume()
			},

			pause() {
				recorder.pause()
			},

			stop(): Promise<Blob> {
				recorder.stop()
				// cleanup
				audio.masterNode.disconnect(audioDest)
				stream.getTracks().forEach(t => t.stop())
				return new Promise((resolve) => {
					recorder.onstop = () => {
						resolve(new Blob(chunks, {
							type: "video/mp4",
						}))
					}
				})
			},

			download(filename = "kaboom.mp4") {
				this.stop().then((blob) => downloadBlob(filename, blob))
			},

		}

	}

	function isFocused(): boolean {
		return document.activeElement === app.canvas
	}

	function destroy(obj: GameObj) {
		obj.destroy()
	}

	// aliases for root game obj operations
	const add: KaboomCtx["add"] = game.root.add.bind(game.root)
	const readd: KaboomCtx["readd"] = game.root.readd.bind(game.root)
	const destroyAll: KaboomCtx["destroyAll"] = game.root.removeAll.bind(game.root)
	const get: KaboomCtx["get"] = game.root.get.bind(game.root)

	// TODO: expose this
	function boom(speed: number = 2, size: number = 1): Comp {
		let time = 0
		return {
			id: "boom",
			require: [ "scale" ],
			update(this: GameObj<ScaleComp>) {
				const s = Math.sin(time * speed) * size
				if (s < 0) {
					this.destroy()
				}
				this.scale = vec2(s)
				time += dt()
			},
		}
	}

	const kaSprite = loadSprite(null, kaSpriteSrc)
	const boomSprite = loadSprite(null, boomSpriteSrc)

	function addKaboom(p: Vec2, opt: BoomOpt = {}): GameObj {

		const kaboom = add([
			pos(p),
			stay(),
		])

		const speed = (opt.speed || 1) * 5
		const s = opt.scale || 1

		kaboom.add([
			sprite(boomSprite),
			scale(0),
			anchor("center"),
			boom(speed, s),
			...opt.comps ?? [],
		])

		const ka = kaboom.add([
			sprite(kaSprite),
			scale(0),
			anchor("center"),
			timer(0.4 / speed, () => ka.use(boom(speed, s))),
			...opt.comps ?? [],
		])

		ka.onDestroy(() => kaboom.destroy())

		return kaboom

	}

	function processGamepad() {

		for (const gamepad of navigator.getGamepads()) {

			if (!gamepad) continue

			const custom = gopt.gamepads ?? {}
			const map = custom[gamepad.id] ?? GAMEPAD_MAP[gamepad.id] ?? GAMEPAD_MAP["default"]

			for (let i = 0; i < gamepad.buttons.length; i++) {
				if (gamepad.buttons[i].pressed) {
					if (!app.gamepadButtonState.down.has(map.buttons[i])) {
						app.gamepadButtonState.press(map.buttons[i])
						game.ev.trigger("gamepadButtonPress", map.buttons[i])
					}
					game.ev.trigger("gamepadButtonDown", map.buttons[i])
				} else {
					if (app.gamepadButtonState.down.has(map.buttons[i])) {
						app.gamepadButtonState.release(map.buttons[i])
						game.ev.trigger("gamepadButtonRelease", map.buttons[i])
					}
				}
			}

			for (const stickName in map.sticks) {
				const stick = map.sticks[stickName]
				const axisX = gamepad.axes[stick.x]
				const axisY = gamepad.axes[stick.y]
				// TODO: should these send every frame or when it changed?
				game.ev.trigger("gamepadStick", stickName, new Vec2(axisX, axisY))
			}

		}

	}

	function inputFrame() {
		game.ev.trigger("input")
		app.keyState.down.forEach((k) => game.ev.trigger("keyDown", k))
		app.mouseState.down.forEach((k) => game.ev.trigger("mouseDown", k))
		app.virtualButtonState.down.forEach((k) => game.ev.trigger("virtualButtonDown", k))
		processGamepad()
	}

	function updateFrame() {
		// update every obj
		game.root.update()
	}

	class Collision {
		source: GameObj
		target: GameObj
		displacement: Vec2
		resolved: boolean = false
		constructor(source: GameObj, target: GameObj, dis: Vec2, resolved = false) {
			this.source = source
			this.target = target
			this.displacement = dis
			this.resolved = resolved
		}
		reverse() {
			return new Collision(
				this.target,
				this.source,
				this.displacement.scale(-1),
				this.resolved,
			)
		}
		hasOverlap() {
			return !this.displacement.isZero()
		}
		isLeft() {
			return this.displacement.x > 0
		}
		isRight() {
			return this.displacement.x < 0
		}
		isTop() {
			return this.displacement.y > 0
		}
		isBottom() {
			return this.displacement.y < 0
		}
		preventResolution() {
			this.resolved = true
		}
	}

	function checkFrame() {

		// TODO: persistent grid?
		// start a spatial hash grid for more efficient collision detection
		const grid: Record<number, Record<number, GameObj<AreaComp>[]>> = {}
		const cellSize = gopt.hashGridSize || DEF_HASH_GRID_SIZE

		// current transform
		let tr = new Mat4()

		// a local transform stack
		const stack = []

		function checkObj(obj: GameObj) {

			stack.push(tr.clone())

			// Update object transform here. This will be the transform later used in rendering.
			if (obj.pos) tr.translate(obj.pos)
			if (obj.scale) tr.scale(obj.scale)
			if (obj.angle) tr.rotate(obj.angle)
			obj.transform = tr.clone()

			if (obj.c("area") && !obj.paused) {

				// TODO: only update worldArea if transform changed
				const aobj = obj as GameObj<AreaComp>
				const area = aobj.worldArea()
				const bbox = area.bbox()

				// Get spatial hash grid coverage
				const xmin = Math.floor(bbox.pos.x / cellSize)
				const ymin = Math.floor(bbox.pos.y / cellSize)
				const xmax = Math.ceil((bbox.pos.x + bbox.width) / cellSize)
				const ymax = Math.ceil((bbox.pos.y + bbox.height) / cellSize)

				// Cache objs that are already checked
				const checked = new Set()

				// insert & check against all covered grids
				for (let x = xmin; x <= xmax; x++) {
					for (let y = ymin; y <= ymax; y++) {
						if(!grid[x]) {
							grid[x] = {}
							grid[x][y] = [aobj]
						} else if(!grid[x][y]) {
							grid[x][y] = [aobj]
						} else {
							const cell = grid[x][y]
							check: for (const other of cell) {
								if (!other.exists()) {
									continue
								}
								if (checked.has(other.id)) {
									continue
								}
								for (const tag of aobj.collisionIgnore) {
									if (other.is(tag)) {
										continue check
									}
								}
								for (const tag of other.collisionIgnore) {
									if (aobj.is(tag)) {
										continue check
									}
								}
								// TODO: cache the world area here
								const res = sat(aobj.worldArea(), other.worldArea())
								if (res) {
									// TODO: rehash if the object position is changed after resolution?
									const col1 = new Collision(aobj, other, res)
									aobj.trigger("collideUpdate", other, col1)
									const col2 = col1.reverse()
									// resolution only has to happen once
									col2.resolved = col1.resolved
									other.trigger("collideUpdate", aobj, col2)
								}
								checked.add(other.id)
							}
							cell.push(aobj)
						}
					}
				}

			}

			obj.children.forEach(checkObj)
			tr = stack.pop()

		}

		checkObj(game.root)

	}

	function drawFrame() {

		// calculate camera matrix
		const cam = game.cam
		const shake = Vec2.fromAngle(rand(0, 360)).scale(cam.shake)

		cam.shake = lerp(cam.shake, 0, 5 * dt())
		cam.transform = new Mat4()
			.translate(center())
			.scale(cam.scale)
			.rotate(cam.angle)
			.translate((cam.pos ?? center()).scale(-1).add(shake))

		game.root.draw()
		flush()

	}

	function drawLoadScreen() {

		const progress = loadProgress()

		if (game.ev.numListeners("loading") > 0) {
			game.ev.trigger("loading", progress)
		} else {
			drawUnscaled(() => {
				const w = width() / 2
				const h = 24
				const pos = vec2(width() / 2, height() / 2).sub(vec2(w / 2, h / 2))
				drawRect({
					pos: vec2(0),
					width: width(),
					height: height(),
					color: rgb(0, 0, 0),
				})
				drawRect({
					pos: pos,
					width: w,
					height: h,
					fill: false,
					outline: {
						width: 4,
					},
				})
				drawRect({
					pos: pos,
					width: w * progress,
					height: h,
				})
			})
		}

	}

	function drawInspectText(pos, txt) {

		drawUnscaled(() => {

			const pad = vec2(8)

			pushTransform()
			pushTranslate(pos)

			const ftxt = formatText({
				text: txt,
				font: DBG_FONT,
				size: 16,
				pos: pad,
				color: rgb(255, 255, 255),
				fixed: true,
			})

			const bw = ftxt.width + pad.x * 2
			const bh = ftxt.height + pad.x * 2

			if (pos.x + bw >= width()) {
				pushTranslate(vec2(-bw, 0))
			}

			if (pos.y + bh >= height()) {
				pushTranslate(vec2(0, -bh))
			}

			drawRect({
				width: bw,
				height: bh,
				color: rgb(0, 0, 0),
				radius: 4,
				opacity: 0.8,
				fixed: true,
			})

			drawFormattedText(ftxt)
			popTransform()

		})

	}

	function drawDebug() {

		if (debug.inspect) {

			let inspecting = null

			for (const obj of game.root.get("*", { recursive: true })) {
				if (obj.c("area") && obj.isHovering()) {
					inspecting = obj
					break
				}
			}

			game.root.drawInspect()

			if (inspecting) {

				const lines = []
				const data = inspecting.inspect()

				for (const tag in data) {
					if (data[tag]) {
						lines.push(`${tag}: ${data[tag]}`)
					} else {
						lines.push(`${tag}`)
					}
				}

				drawInspectText(contentToView(mousePos()), lines.join("\n"))

			}

			drawInspectText(vec2(8), `FPS: ${debug.fps()}`)

		}

		if (debug.paused) {

			drawUnscaled(() => {

				// top right corner
				pushTransform()
				pushTranslate(width(), 0)
				pushTranslate(-8, 8)

				const size = 32

				// bg
				drawRect({
					width: size,
					height: size,
					anchor: "topright",
					color: rgb(0, 0, 0),
					opacity: 0.8,
					radius: 4,
					fixed: true,
				})

				// pause icon
				for (let i = 1; i <= 2; i++) {
					drawRect({
						width: 4,
						height: size * 0.6,
						anchor: "center",
						pos: vec2(-size / 3 * i, size * 0.5),
						color: rgb(255, 255, 255),
						radius: 2,
						fixed: true,
					})
				}

				popTransform()

			})

		}

		if (debug.timeScale !== 1) {

			drawUnscaled(() => {

				// bottom right corner
				pushTransform()
				pushTranslate(width(), height())
				pushTranslate(-8, -8)

				const pad = 8

				// format text first to get text size
				const ftxt = formatText({
					text: debug.timeScale.toFixed(1),
					font: DBG_FONT,
					size: 16,
					color: rgb(255, 255, 255),
					pos: vec2(-pad),
					anchor: "botright",
					fixed: true,
				})

				// bg
				drawRect({
					width: ftxt.width + pad * 2 + pad * 4,
					height: ftxt.height + pad * 2,
					anchor: "botright",
					color: rgb(0, 0, 0),
					opacity: 0.8,
					radius: 4,
					fixed: true,
				})

				// fast forward / slow down icon
				for (let i = 0; i < 2; i++) {
					const flipped = debug.timeScale < 1
					drawTriangle({
						p1: vec2(-ftxt.width - pad * (flipped ? 2 : 3.5), -pad),
						p2: vec2(-ftxt.width - pad * (flipped ? 2 : 3.5), -pad - ftxt.height),
						p3: vec2(-ftxt.width - pad * (flipped ? 3.5 : 2), -pad - ftxt.height / 2),
						pos: vec2(-i * pad * 1 + (flipped ? -pad * 0.5 : 0), 0),
						color: rgb(255, 255, 255),
						fixed: true,
					})
				}

				// text
				drawFormattedText(ftxt)

				popTransform()

			})

		}

		if (debug.curRecording) {

			drawUnscaled(() => {

				pushTransform()
				pushTranslate(0, height())
				pushTranslate(24, -24)

				drawCircle({
					radius: 12,
					color: rgb(255, 0, 0),
					opacity: wave(0, 1, time() * 4),
					fixed: true,
				})

				popTransform()

			})

		}

		if (debug.showLog && game.logs.length > 0) {

			drawUnscaled(() => {

				pushTransform()
				pushTranslate(0, height())
				pushTranslate(8, -8)

				const pad = 8

				const ftext = formatText({
					text: game.logs.join("\n"),
					font: DBG_FONT,
					pos: vec2(pad, -pad),
					anchor: "botleft",
					size: 16,
					width: width() * 0.6,
					lineSpacing: pad / 2,
					fixed: true,
					styles: {
						"time": { color: rgb(127, 127, 127) },
						"info": { color: rgb(255, 255, 255) },
						"error": { color: rgb(255, 0, 127) },
					},
				})

				drawRect({
					width: ftext.width + pad * 2,
					height: ftext.height + pad * 2,
					anchor: "botleft",
					color: rgb(0, 0, 0),
					radius: 4,
					opacity: 0.8,
					fixed: true,
				})

				drawFormattedText(ftext)
				popTransform()

			})

		}

	}

	function drawVirtualControls() {

		// TODO: mousePos incorrect in "stretch" mode and gopt.scale
		const mpos = mousePos()

		const drawCircleButton = (pos: Vec2, btn: VirtualButton, text?: string) => {

			const size = 80

			drawCircle({
				radius: size / 2,
				pos: pos,
				outline: { width: 4, color: rgb(0, 0, 0) },
				opacity: 0.5,
				fixed: true,
			})

			if (text) {
				drawText({
					text: text,
					pos: pos,
					color: rgb(0, 0, 0),
					size: 40,
					anchor: "center",
					opacity: 0.5,
					fixed: true,
				})
			}

			// TODO: touch
			if (isMousePressed("left")) {
				if (testCirclePoint(new Circle(pos, size / 2), mpos)) {
					game.ev.onOnce("input", () => {
						// TODO: caller specify another value as connected key?
						app.virtualButtonState.press(btn)
						game.ev.trigger("virtualButtonPress", btn)
						app.keyState.press(btn)
						game.ev.trigger("keyPress", btn)
					})
				}
			}

			if (isMouseReleased("left")) {
				game.ev.onOnce("input", () => {
					app.virtualButtonState.release(btn)
					game.ev.trigger("virtualButtonRelease", btn)
					app.keyState.release(btn)
					game.ev.trigger("keyRelease", btn)
				})
			}

		}

		const drawSquareButton = (pos: Vec2, btn: VirtualButton, text?: string) => {

			const size = 64

			drawRect({
				width: size,
				height: size,
				pos: pos,
				outline: { width: 4, color: rgb(0, 0, 0) },
				radius: 4,
				anchor: "center",
				opacity: 0.5,
				fixed: true,
			})

			if (text) {
				drawText({
					text: text,
					pos: pos,
					color: rgb(0, 0, 0),
					size: 40,
					anchor: "center",
					opacity: 0.5,
					fixed: true,
				})
			}

			// TODO: touch
			if (isMousePressed("left")) {
				if (testRectPoint(new Rect(pos.add(-size / 2, -size / 2), size, size), mpos)) {
					game.ev.onOnce("input", () => {
						// TODO: caller specify another value as connected key?
						app.virtualButtonState.press(btn)
						game.ev.trigger("virtualButtonPress", btn)
						app.keyState.press(btn)
						game.ev.trigger("keyPress", btn)
					})
				}
			}

			if (isMouseReleased("left")) {
				game.ev.onOnce("input", () => {
					app.virtualButtonState.release(btn)
					game.ev.trigger("virtualButtonRelease", btn)
					app.keyState.release(btn)
					game.ev.trigger("keyRelease", btn)
				})
			}

		}

		drawUnscaled(() => {
			drawCircleButton(vec2(width() - 80, height() - 160), "a")
			drawCircleButton(vec2(width() - 160, height() - 80), "b")
			drawSquareButton(vec2(60, height() - 124), "left")
			drawSquareButton(vec2(188, height() - 124), "right")
			drawSquareButton(vec2(124, height() - 188), "up")
			drawSquareButton(vec2(124, height() - 60), "down")
		})

	}

	if (gopt.debug !== false) {
		enterDebugMode()
	}

	if (gopt.burp) {
		enterBurpMode()
	}

	function onLoading(action: (progress: number) => void) {
		game.ev.on("loading", action)
	}

	function onResize(action: () => void) {
		game.ev.on("resize", action)
	}

	function onGamepadConnect(action: (gamepad: Gamepad) => void) {
		game.ev.on("gamepadConnect", action)
	}

	function onGamepadDisconnect(action: (gamepad: Gamepad) => void) {
		game.ev.on("gamepadDisconnect", action)
	}

	function onError(action: (err: Error) => void) {
		game.ev.on("error", action)
	}

	function handleErr(err: Error) {

		// TODO: this should only run once
		run(() => {

			drawUnscaled(() => {

				const pad = 32
				const gap = 16
				const gw = width()
				const gh = height()

				const textStyle = {
					size: 36,
					width: gw - pad * 2,
					letterSpacing: 4,
					lineSpacing: 4,
					font: DBG_FONT,
					fixed: true,
				}

				drawRect({
					width: gw,
					height: gh,
					color: rgb(0, 0, 255),
					fixed: true,
				})

				const title = formatText({
					...textStyle,
					text: err.name,
					pos: vec2(pad),
					color: rgb(255, 128, 0),
					fixed: true,
				})

				drawFormattedText(title)

				drawText({
					...textStyle,
					text: err.message,
					pos: vec2(pad, pad + title.height + gap),
					fixed: true,
				})

				popTransform()
				game.ev.trigger("error", err)

			})

		})

	}

	function resetInputState() {
		app.keyState.update()
		app.mouseState.update()
		app.virtualButtonState.update()
		app.gamepadButtonState.update()
		app.charInputted = []
		app.isMouseMoved = false
	}

	function run(f: () => void) {

		if (app.loopID !== null) {
			cancelAnimationFrame(app.loopID)
		}

		const frame = (t: number) => {

			if (app.stopped) return

			if (document.visibilityState !== "visible") {
				app.loopID = requestAnimationFrame(frame)
				return
			}

			const realTime = t / 1000
			const realDt = realTime - app.realTime

			app.realTime = realTime

			if (!app.skipTime) {
				app.dt = realDt
				app.time += dt()
				app.fpsCounter.tick(app.dt)
			}

			app.skipTime = false
			app.numFrames++

			frameStart()
			f()
			frameEnd()

			resetInputState()
			game.ev.trigger("frameEnd")
			app.loopID = requestAnimationFrame(frame)

		}

		frame(0)

	}

	function quit() {

		game.ev.onOnce("frameEnd", () => {

			// stop the loop
			app.stopped = true

			// clear canvas
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT)

			// unbind everything
			const numTextureUnits = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)

			for (let unit = 0; unit < numTextureUnits; unit++) {
				gl.activeTexture(gl.TEXTURE0 + unit)
				gl.bindTexture(gl.TEXTURE_2D, null)
				gl.bindTexture(gl.TEXTURE_CUBE_MAP, null)
			}

			gl.bindBuffer(gl.ARRAY_BUFFER, null)
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)
			gl.bindRenderbuffer(gl.RENDERBUFFER, null)
			gl.bindFramebuffer(gl.FRAMEBUFFER, null)

			// run all scattered gc events
			gc.forEach((f) => f())

			// delete webgl buffers
			gl.deleteBuffer(gfx.vbuf)
			gl.deleteBuffer(gfx.ibuf)

			// unregister events
			for (const name in canvasEvents) {
				app.canvas.removeEventListener(name, canvasEvents[name])
			}

			for (const name in docEvents) {
				document.removeEventListener(name, docEvents[name])
			}

			for (const name in winEvents) {
				window.removeEventListener(name, winEvents[name])
			}

		})

	}

	function tween<V extends LerpValue>(
		from: V,
		to: V,
		duration: number,
		setValue: (value: V) => void,
		easeFunc = easings.linear,
	): TweenController {
		let curTime = 0
		const onEndEvents: Array<() => void> = []
		const ev = onUpdate(() => {
			curTime += dt()
			const t = Math.min(curTime / duration, 1)
			setValue(lerp(from, to, easeFunc(t)))
			if (t === 1) {
				ev.cancel()
				setValue(to)
				onEndEvents.forEach((action) => action())
			}
		})
		return {
			get paused() {
				return ev.paused
			},
			set paused(p) {
				ev.paused = p
			},
			onEnd(action: () => void) {
				onEndEvents.push(action)
			},
			then(action: () => void) {
				this.onEnd(action)
				return this
			},
			cancel() {
				ev.cancel()
			},
			finish() {
				ev.cancel()
				setValue(to)
				onEndEvents.forEach((action) => action())
			},
		}
	}

	let isFirstFrame = true

	// main game loop
	run(() => {

		if (!assets.loaded) {
			if (loadProgress() === 1 && !isFirstFrame) {
				assets.loaded = true
				game.ev.trigger("load")
			}
		}

		if (!assets.loaded && gopt.loadingScreen !== false || isFirstFrame) {

			// TODO: Currently if assets are not initially loaded no updates or timers will be run, however they will run if loadingScreen is set to false. What's the desired behavior or should we make them consistent?
			drawLoadScreen()

		} else {

			inputFrame()
			if (!debug.paused) updateFrame()
			checkFrame()
			drawFrame()

			if (gopt.debug !== false) {
				drawDebug()
			}

			if (gopt.virtualControls && isTouchScreen()) {
				drawVirtualControls()
			}

		}

		if (isFirstFrame) {
			isFirstFrame = false
		}

	})

	updateViewport()

	// the exported ctx handle
	const ctx: KaboomCtx = {
		VERSION,
		// asset load
		loadRoot,
		loadProgress,
		loadSprite,
		loadSpriteAtlas,
		loadSound,
		loadBitmapFont,
		loadFont,
		loadShader,
		loadShaderURL,
		loadAseprite,
		loadPedit,
		loadBean,
		load,
		getSprite,
		getSound,
		getFont,
		getBitmapFont,
		getShader,
		Asset,
		SpriteData,
		SoundData,
		// query
		width,
		height,
		center,
		dt,
		time,
		screenshot,
		record,
		isFocused,
		setCursor,
		getCursor,
		setCursorLocked,
		isCursorLocked,
		setFullscreen,
		isFullscreen,
		isTouchScreen,
		onLoad,
		onLoading,
		onResize,
		onGamepadConnect,
		onGamepadDisconnect,
		onError,
		// misc
		camPos,
		camScale,
		camRot,
		shake,
		toScreen,
		toWorld,
		setGravity,
		getGravity,
		setBackground,
		getBackground,
		getGamepads,
		// obj
		add,
		destroy,
		destroyAll,
		get,
		readd,
		// comps
		pos,
		scale,
		rotate,
		color,
		opacity,
		anchor,
		area,
		sprite,
		text,
		rect,
		circle,
		uvquad,
		outline,
		body,
		doubleJump,
		shader,
		timer,
		fixed,
		stay,
		health,
		lifespan,
		z,
		move,
		offscreen,
		follow,
		state,
		fadeIn,
		tile,
		agent,
		// group events
		on,
		onUpdate,
		onDraw,
		onAdd,
		onDestroy,
		onClick,
		onCollide,
		onCollideUpdate,
		onCollideEnd,
		onHover,
		onHoverUpdate,
		onHoverEnd,
		// input
		onKeyDown,
		onKeyPress,
		onKeyPressRepeat,
		onKeyRelease,
		onMouseDown,
		onMousePress,
		onMouseRelease,
		onMouseMove,
		onCharInput,
		onTouchStart,
		onTouchMove,
		onTouchEnd,
		onScroll,
		onVirtualButtonPress,
		onVirtualButtonDown,
		onVirtualButtonRelease,
		onGamepadButtonDown,
		onGamepadButtonPress,
		onGamepadButtonRelease,
		onGamepadStick,
		mousePos,
		mouseDeltaPos,
		isKeyDown,
		isKeyPressed,
		isKeyPressedRepeat,
		isKeyReleased,
		isMouseDown,
		isMousePressed,
		isMouseReleased,
		isMouseMoved,
		isVirtualButtonPressed,
		isVirtualButtonDown,
		isVirtualButtonReleased,
		isGamepadButtonPressed,
		isGamepadButtonDown,
		isGamepadButtonReleased,
		// getGamepadStick,
		charInputted,
		// timer
		loop,
		wait,
		// audio
		play,
		volume,
		burp,
		audioCtx: audio.ctx,
		// math
		Timer,
		Line,
		Rect,
		Circle,
		Polygon,
		Vec2,
		Color,
		Mat4,
		Quad,
		RNG,
		rand,
		randi,
		randSeed,
		vec2,
		rgb,
		hsl2rgb,
		quad,
		choose,
		chance,
		lerp,
		tween,
		easings,
		map,
		mapc,
		wave,
		deg2rad,
		rad2deg,
		testLineLine,
		testRectRect,
		testRectLine,
		testRectPoint,
		testCirclePolygon,
		testLinePoint,
		testLineCircle,
		// raw draw
		drawSprite,
		drawText,
		formatText,
		drawRect,
		drawLine,
		drawLines,
		drawTriangle,
		drawCircle,
		drawEllipse,
		drawUVQuad,
		drawPolygon,
		drawFormattedText,
		drawMasked,
		drawSubtracted,
		pushTransform,
		popTransform,
		pushTranslate,
		pushScale,
		pushRotate,
		pushMatrix,
		usePostEffect,
		// debug
		debug,
		// scene
		scene,
		go,
		// level
		addLevel,
		// storage
		getData,
		setData,
		download,
		downloadJSON,
		downloadText,
		downloadBlob,
		// plugin
		plug,
		// char sets
		ASCII_CHARS,
		// dom
		canvas: app.canvas,
		// misc
		addKaboom,
		// dirs
		LEFT: Vec2.LEFT,
		RIGHT: Vec2.RIGHT,
		UP: Vec2.UP,
		DOWN: Vec2.DOWN,
		// colors
		RED: Color.RED,
		GREEN: Color.GREEN,
		BLUE: Color.BLUE,
		YELLOW: Color.YELLOW,
		MAGENTA: Color.MAGENTA,
		CYAN: Color.CYAN,
		WHITE: Color.WHITE,
		BLACK: Color.BLACK,
		quit,
		// helpers
		Event,
		EventHandler,
		EventController,
	}

	if (gopt.plugins) {
		gopt.plugins.forEach(plug)
	}

	// export everything to window if global is set
	if (gopt.global !== false) {
		for (const k in ctx) {
			window[k] = ctx[k]
		}
	}

	app.canvas.focus()

	return ctx

}
