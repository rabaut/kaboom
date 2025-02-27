import * as React from "react"
import { Global, css } from "@emotion/react"
import Ctx from "lib/Ctx"
import { Tooltip } from "lib/tooltip"
import View from "comps/View"
import Button from "comps/Button"
import Text from "comps/Text"
import { DEF_THEME, themes, cssVars } from "lib/ui"
import useMousePos from "hooks/useMousePos"
import useSavedState from "hooks/useSavedState"
import useKey from "hooks/useKey"
import IDList from "lib/idlist"

const Page = ({
	children,
}: {
	children?: React.ReactNode,
}) => {

	const [ theme, setTheme ] = useSavedState("theme", DEF_THEME)
	const [ inspect, setInspect ] = React.useState(false)
	const [ tooltipStack, setTooltipStack ] = React.useState<IDList<Tooltip>>(new IDList())

	// make sure theme from local storage don't break anything
	const curTheme = React.useMemo(() => {
		if (!themes[theme]) {
			setTheme(DEF_THEME)
			return DEF_THEME
		}
		return theme
	}, [ theme, setTheme ])

	const curTooltip = React.useMemo(
		() => tooltipStack.size === 0
			? null
			: Array.from(tooltipStack.values())[tooltipStack.size - 1],
		[ tooltipStack ],
	)

	useKey("F1", () => setInspect(!inspect), [ setInspect, inspect ])
	useKey("Escape", () => setInspect(false), [ setInspect ])

	// reset tooltip stack when exiting inspect mode
	React.useEffect(() => {
		if (!inspect) {
			setTooltipStack(new IDList())
		}
	}, [ inspect ])

	// push a tooltip into tooltip stack, returning the id
	const pushTooltip = React.useCallback((t: Tooltip) => {

		return new Promise<number>((resolve, reject) => {

			setTooltipStack((prevStack) => {

				// if it's already the current tooltip, we just return that
				const last = Array.from(prevStack)[prevStack.size - 1]

				if (last && t.name === last[1].name && t.desc === last[1].desc) {
					resolve(last[0])
					return prevStack
				}

				const newStack = prevStack.clone()
				const id = newStack.push(t)

				resolve(id)

				return newStack

			})

		})

	}, [ setTooltipStack ])

	// pop a tooltip from tooltip stack with id
	const popTooltip = React.useCallback((id: number) => {
		setTooltipStack((prevStack) => {
			const newStack = prevStack.clone()
			newStack.delete(id)
			return newStack
		})
	}, [ setTooltipStack ])

	return (
		<Ctx.Provider value={{
			theme: curTheme,
			setTheme,
			inspect,
			setInspect,
			pushTooltip,
			popTooltip,
		}}>
			<Global
				styles={css`
					${cssVars}
					@font-face {
						font-family: IBM Plex Sans;
						src: url(/static/fonts/IBMPlexSans-Regular.ttf) format("truetype");
						font-display: block;
					}
					@font-face {
						font-family: IBM Plex Mono;
						src: url(/static/fonts/IBMPlexMono-Regular.ttf) format("truetype");
						font-display: block;
					}
					* {
						margin: 0;
						padding: 0;
						box-sizing: border-box;
						outline: none;
						color: inherit;
						font-size: inherit;
						font-family: inherit;
					}
					html {
						width: 100%;
						height: 100%;
						font-family: IBM Plex Sans;
						font-size: var(--text-normal);
						color: var(--color-fg1);
						overflow: hidden;
					}
					body {
						width: 100%;
						height: 100%;
						overflow: hidden;
					}
					a {
						text-decoration: none;
						color: var(--color-highlight);
						cursor: pointer;
					}
					#__next {
						width: 100%;
						height: 100%;
					}
					::selection {
						background: var(--color-bg4);
					}
				`}
			/>
			<div
				className={theme}
				css={{
					background: "var(--color-bg1)",
					width: "100%",
					height: "100%",
				}}
			>
				{children}
			</div>
			{ inspect && <View
				stretch
				pad={2}
				align="end"
				justify="end"
				css={{
					position: "fixed",
					top: 0,
					left: 0,
					background: "rgba(0, 0, 0, 0.3)",
					pointerEvents: "none",
					zIndex: 10000,
				}}
			>
				<Button
					action={() => setInspect(false)}
					text="Exit inspect mode"
					css={{
						pointerEvents: "auto",
					}}
				/>
			</View> }
			{ inspect && curTooltip && <TooltipComp {...curTooltip} /> }
		</Ctx.Provider>
	)

}

const TooltipComp: React.FC<Tooltip> = ({
	name,
	desc,
}) => {
	const [ mouseX, mouseY ] = useMousePos()
	if (!mouseX || !mouseY) {
		return <></>
	}
	return (
		<View
			bg={1}
			pad={1.5}
			rounded
			outlined
			css={{
				position: "absolute",
				zIndex: 20000,
				maxWidth: "320px",
				pointerEvents: "none",
				overflow: "hidden",
				top: mouseY,
				left: mouseX,
			}}
		>
			{
				name &&
			<Text>{name}</Text>
			}
			<Text color={2}>{desc}</Text>
		</View>
	)
}

export default Page
