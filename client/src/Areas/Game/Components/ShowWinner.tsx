import * as React from "react";
import {GameDataStore, IGameDataStorePayload} from "../../../Global/DataStore/GameDataStore";
import {IUserData, UserDataStore} from "../../../Global/DataStore/UserDataStore";
import {Typography} from "@material-ui/core";
import Divider from "@material-ui/core/Divider";
import {Platform} from "../../../Global/Platform/platform";
import {WhiteCard} from "../../../UI/WhiteCard";
import Grid from "@material-ui/core/Grid";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Avatar from "@material-ui/core/Avatar";
import sanitize from "sanitize-html";
import CircularProgress from "@material-ui/core/CircularProgress";
import {LoadingButton} from "../../../UI/LoadingButton";
import {BlackCard} from "../../../UI/BlackCard";

interface IShowWinnerProps
{
}

interface DefaultProps
{
}

type Props = IShowWinnerProps & DefaultProps;
type State = IShowWinnerState;

interface IShowWinnerState
{
	gameData: IGameDataStorePayload;
	userData: IUserData;
	timeDownStarted: boolean,
	beforeContinueRemaining: number;
	autoProceedRemaining: number;
	roundStartLoading: boolean;
}

export class ShowWinner extends React.Component<Props, State>
{
	constructor(props: Props)
	{
		super(props);

		this.state = {
			gameData: GameDataStore.state,
			userData: UserDataStore.state,
			timeDownStarted: false,
			beforeContinueRemaining: 100,
			autoProceedRemaining: 100,
			roundStartLoading: false
		};
	}

	public componentDidMount(): void
	{
		GameDataStore.listen(data => this.setState({
			gameData: data
		}));

		UserDataStore.listen(data => this.setState({
			userData: data
		}));
	}

	private animate = (startTime: number, beforeContinueDelay: number, autoProceedDelay: number) =>
	{
		const now = Date.now();
		const diff = now - startTime;
		const beforeContinueRemaining = Math.max(0, Math.floor((1 - Math.min(1, diff / beforeContinueDelay)) * 100));
		const autoProceedRemaining = Math.max(Math.floor((1 - Math.min(1, diff / autoProceedDelay)) * 100));
		this.setState({
			beforeContinueRemaining,
			autoProceedRemaining
		});

		if (beforeContinueRemaining > 0 || autoProceedRemaining > 0)
		{
			requestAnimationFrame(() => this.animate(startTime, beforeContinueDelay, autoProceedDelay));
		}
	};

	public componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any): void
	{
		const game = this.state.gameData.game;
		const lastWinner = game?.lastWinner;
		const winnerCardIds = lastWinner?.whiteCards ?? [];
		const winnerCustomCards = lastWinner ? game?.roundCardsCustom?.[lastWinner.guid] ?? [] : [];
		const winnerCards = winnerCardIds.map(cardId => this.state.gameData.roundCardDefs?.[cardId.packId]?.[cardId.cardIndex]);
		if (lastWinner && game && (winnerCards.length > 0 || winnerCustomCards.length > 0) && !this.state.timeDownStarted)
		{
			const startTime = Date.now();
			const beforeContinueDelay = 3000;
			const autoProceedDelay = 10000;

			this.setState({
				timeDownStarted: true
			});

			this.animate(startTime, beforeContinueDelay, autoProceedDelay);
		}
	}

	private roundStartClick = () =>
	{
		if (this.state.gameData.game?.id)
		{
			this.setState({
				roundStartLoading: true
			});

			Platform.nextRound(this.state.gameData.game.id, this.state.userData.playerGuid)
				.catch(e => console.error(e))
				.finally(() => this.setState({
					roundStartLoading: false
				}));
		}
	};

	public render()
	{
		const game = this.state.gameData.game;
		const customCards = game?.roundCardsCustom ?? {};
		const settings = game?.settings;
		const players = game?.players ?? {};
		const playerGuids = Object.keys(players);
		const gameWinnerGuid = playerGuids.find(pg => (players?.[pg].wins ?? 0) >= (settings?.roundsToWin ?? 99));
		const gameWinner = gameWinnerGuid ? game?.players?.[gameWinnerGuid] : undefined;
		const lastWinner = game?.lastWinner ?? gameWinner;
		if(!lastWinner)
		{
			return null;
		}

		const winnerCardIds = lastWinner?.whiteCards ?? [];
		const winnerCards = settings?.customWhites
			?  customCards[lastWinner.guid]
			: winnerCardIds.map(cardId => this.state.gameData.roundCardDefs?.[cardId.packId]?.[cardId.cardIndex]);
		const blackCardContent = this.state.gameData.blackCardDef?.content;
		if (!lastWinner || !game || winnerCards.length === 0 || !blackCardContent)
		{
			return null;
		}

		const isChooser = game.chooserGuid === this.state.userData.playerGuid;

		const winner = game.players[lastWinner.guid];

		const sortedPlayerGuids = [...playerGuids].sort((a, b) => game.players[b].wins - game.players[a].wins);

		return (
			<>
				<Grid style={{margin: "1rem 0 0.5rem", justifyContent: "center"}} container spacing={3}>
					<Grid item xs={12} sm={6} md={4} lg={3}>
						<BlackCard packId={this.state.gameData.game?.blackCard.packId}>
							{blackCardContent}
						</BlackCard>
					</Grid>
					<Grid item xs={12} sm={6} md={4} lg={3}>
						<WhiteCard>
							{winnerCards.map(card => card && (
								<>
									<div dangerouslySetInnerHTML={{__html: sanitize(unescape(card))}}/>
									<Divider/>
								</>
							))}
						</WhiteCard>
					</Grid>
				</Grid>
				<Grid item xs={12} sm={12}>
					{!gameWinner && (
						<>
							{isChooser && (
								<div style={{textAlign: "center"}}>
									<LoadingButton
										loading={this.state.roundStartLoading}
										startIcon={
											this.state.beforeContinueRemaining > 0 && <CircularProgress
                                                variant={"determinate"}
                                                value={this.state.beforeContinueRemaining}
                                                size={20}
                                            />
										}
										size={"large"}
										color={"secondary"}
										variant={"contained"}
										onClick={this.roundStartClick}
										disabled={this.state.beforeContinueRemaining > 0}
									>
										Start Next round
									</LoadingButton>
								</div>
							)}
							<div style={{marginBottom: "2rem", textAlign: "center"}}>
								<div style={{display: "inline-flex", justifyContent: "center", margin: "2rem auto 0"}}>
									<ListItemAvatar>
										<CircularProgress
											variant={"static"}
											value={this.state.autoProceedRemaining}
											size={20}
										/>
									</ListItemAvatar>
									<ListItemText>
										Next round auto-starting...
									</ListItemText>
								</div>
							</div>
						</>
					)}
					<Divider style={{margin: "1rem 0"}}/>
					<Typography variant={"h4"}>
						Winner: {unescape(winner?.nickname)}!
					</Typography>
					<div style={{marginTop: "1rem"}}>
						<Typography>Scoreboard</Typography>
						<List>
							{sortedPlayerGuids.map((pg, i) => (
								<>
									{i > 0 && i <= sortedPlayerGuids.length - 1 && (
										<Divider/>
									)}
									<ListItem>
										<ListItemAvatar>
											<Avatar>
												<strong>{game?.players[pg].wins}</strong>
											</Avatar>
										</ListItemAvatar>
										<ListItemText>
											<Typography>
												{unescape(game?.players[pg].nickname)}
											</Typography>
										</ListItemText>
									</ListItem>
								</>
							))}
						</List>
					</div>
				</Grid>
			</>
		);
	}
}