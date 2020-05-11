import Grid from "@material-ui/core/Grid";
import {WhiteCard} from "../../../UI/WhiteCard";
import Button from "@material-ui/core/Button";
import * as React from "react";
import {IGameDataStorePayload} from "../../../Global/DataStore/GameDataStore";
import {IUserData} from "../../../Global/DataStore/UserDataStore";
import {useEffect, useState} from "react";
import sanitize from "sanitize-html";
import {CardId} from "../../../Global/Platform/Contract";
import deepEqual from "deep-equal";
import moment from "moment";
import {CircularProgress, Typography} from "@material-ui/core";

interface Props
{
	gameData: IGameDataStorePayload;
	userData: IUserData;
	targetPicked: number;
	onPickUpdate: (cards: CardId[]) => void;
}

let interval = 0;
export const WhiteCardHand: React.FC<Props> =
	({
		 userData,
		 gameData,
		 targetPicked,
		 onPickUpdate
	 }) =>
	{
		const [pickedCards, setPickedCards] = useState<CardId[]>([]);
		const [timeRemaining, setTimeRemaining] = useState(0);

		const endTime = gameData.roundStartTime.clone().add(gameData.ownerSettings.roundTimeoutSeconds, "seconds");

		const calculateRemaining = () =>
		{
			const diff = endTime.diff(moment());
			setTimeRemaining(Math.max(diff, 0));
		};

		useEffect(() =>
		{
			clearInterval(interval);
			interval = window.setInterval(calculateRemaining, 1000 / 30);

			return () => clearInterval(interval);
		});

		const onPick = (id: CardId) =>
		{
			const newVal = [...pickedCards, id];
			setPickedCards(newVal);
			onPickUpdate(newVal);
		};

		const onUnpick = (id: CardId) =>
		{
			const newVal = pickedCards.filter(a => !deepEqual(a, id));
			setPickedCards(newVal);
			onPickUpdate(newVal);
		};

		if (!gameData.game)
		{
			return null;
		}

		const {
			players,
			roundCards,
		} = gameData.game;

		const me = players[userData.playerGuid];

		if (!me)
		{
			return null;
		}

		const playerCardIds = me.whiteCards;

		const hasPlayed = userData.playerGuid in roundCards;

		let renderedCardIds = hasPlayed
			? []
			: playerCardIds;

		const renderedDefs = hasPlayed
			? gameData.roundCardDefs
			: gameData.playerCardDefs;

		const metPickTarget = targetPicked <= pickedCards.length;

		const remainingPct = timeRemaining / (gameData.ownerSettings.roundTimeoutSeconds * 1000);

		const renderedHand = renderedCardIds.map((cardId, i) =>
		{
			const pickedIndex = pickedCards.indexOf(cardId);
			const picked = pickedIndex > -1;
			const label = picked
				? targetPicked > 1
					? `Picked: ${pickedIndex + 1}`
					: "Picked"
				: "Pick";

			return (
				<Grid item xs={12} sm={6} md={4} lg={3}>
					{cardId && (
						<WhiteCard
							packId={cardId.packId}
							key={cardId.cardIndex + cardId.cardIndex}
							actions={!hasPlayed && (
								<>
									<Button
										variant={"contained"}
										color={"secondary"}
										disabled={metPickTarget || !!pickedCards.find(c => deepEqual(c, cardId))}
										onClick={() => onPick(cardId)}
									>
										{label}
									</Button>
									<Button
										variant={"contained"}
										color={"secondary"}
										disabled={!pickedCards.find(c => deepEqual(c, cardId))}
										onClick={() => onUnpick(cardId)}
									>
										Unpick
									</Button>
								</>
							)}
						>
							<div dangerouslySetInnerHTML={{__html: sanitize(unescape(renderedDefs?.[cardId.packId]?.[cardId.cardIndex] ?? ""))}}/>
						</WhiteCard>
					)}
				</Grid>
			);
		});

		return <>
			{!(me.guid in (gameData.game?.roundCards ?? {})) && (
				<Grid container style={{justifyContent: "center", marginTop: "2rem"}} spacing={3}>
					<CircularProgress size={20} color={"secondary"} variant={"static"} value={remainingPct * 100} />
					<Typography style={{marginLeft: "1rem"}}>
						{Math.floor(timeRemaining / 1000)} seconds remaining to pick cards
					</Typography>
				</Grid>
			)}
			<Grid container style={{justifyContent: "center", marginTop: "1rem"}} spacing={3}>
				{renderedHand}
			</Grid>
		</>;
	};