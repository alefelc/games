import type { Card, ContentBundle, GameMode, GameSetup, Id, SessionState } from '../types';
import { eligibleCards } from './eligibility';
import { weightedPick } from './random';
import { buildHistoryKey, readCardHistory, rememberCard, resetCardHistory } from './persistentHistory';
import { chooseInventoryPool } from './inventoryCoverage';

function historyContext(content: ContentBundle, setup: GameSetup) {
  const gameId = String((content.game as { id?: Id }).id ?? 'default');
  const players: 1 | 2 = setup.playerTwoSexId || setup.playerTwo.trim() ? 2 : 1;
  return { key: buildHistoryKey(gameId, setup.modeId, players), limit: Math.max(50, Number((content.settings as typeof content.settings & { cross_session_history_limit?: number }).cross_session_history_limit ?? 800)) };
}

export function createDefaultSetup(content: ContentBundle): GameSetup {
  const safeLevels = content.levels.filter(level => !level.requires_confirmation).map(level => level.id);
  const fallbackLevel = content.settings.default_level ?? content.levels[0]?.id ?? '';
  const defaultLevels = safeLevels.length ? safeLevels : [fallbackLevel];
  const defaultMode = content.settings.default_mode ?? content.modes[0]?.id ?? '';
  const definitions = (((content as unknown) as { filters?: Array<{ key:string; filter_kind:string; default_enabled:boolean; default_number?:number|null }> }).filters ?? []);
  const dynamic = Object.fromEntries(definitions.map(def => [def.key, def.filter_kind === 'max_number' ? Number(def.default_number ?? 1) : Boolean(def.default_enabled)]));
  return { playerOne:'', playerTwo:'', playerOneSexId:null, playerTwoSexId:null, modeId:defaultMode, levelIds:defaultLevels, deckIds:content.decks.filter(deck=>deck.active).map(deck=>deck.id), elementIds:content.elements.filter(item=>(item as typeof item & {default_selected?:boolean}).default_selected).map(item=>item.id), toyIds:content.toys.filter(item=>(item as typeof item & {default_selected?:boolean}).default_selected).map(item=>item.id), filters:{ excludePhotoVideo:content.settings.default_exclude_photo_video, excludeThirdParties:content.settings.default_exclude_third_parties, excludePublicPlaces:content.settings.default_exclude_public_places, excludeRestraint:content.settings.default_exclude_restraint, excludePenetration:false, excludeOral:false, excludeNudity:false, excludeExplicitLanguage:false, excludeFood:false, excludeTemperature:false, excludeRoleplay:false, excludeManualStimulation:false, excludeToys:false, maxPrivacyRisk:1, maxPhysicalRisk:1, ...dynamic } as GameSetup['filters'], maxCards:Math.min(100,Math.max(1,content.settings.maximum_cards_per_session||20)), intenseConsent:false };
}

export function createSession(content: ContentBundle, setup: GameSetup): SessionState {
  const mode=content.modes.find(item=>item.id===setup.modeId)??content.modes[0];const startingLevel=resolveStartingLevel(content,setup,mode);const {key}=historyContext(content,setup);
  return { id:crypto.randomUUID(),startedAt:new Date().toISOString(),endedAt:null,currentCardId:null,currentLevelId:startingLevel,currentPlayer:0,revealed:false,usedCardIds:readCardHistory(key),completedCardIds:[],skippedCardIds:[],resolvedCount:0,timerStartedAt:null,timerRemaining:null };
}

function resolveStartingLevel(content:ContentBundle,setup:GameSetup,mode?:GameMode):Id|null{const selected=new Set(setup.levelIds);if(mode?.slug==='solo-previa')return content.levels.find(level=>level.slug==='previa')?.id??setup.levelIds[0]??null;if(mode?.starting_level&&selected.has(mode.starting_level))return mode.starting_level;return content.levels.filter(level=>selected.has(level.id)).sort((a,b)=>a.intensity_order-b.intensity_order)[0]?.id??null;}
function targetLevelForDraw(content:ContentBundle,setup:GameSetup,session:SessionState,mode:GameMode):Id|null{const levels=content.levels.filter(level=>setup.levelIds.includes(level.id)).sort((a,b)=>a.intensity_order-b.intensity_order);if(mode.slug==='solo-previa')return levels.find(level=>level.slug==='previa')?.id??levels[0]?.id??null;if(mode.automatic_progression&&mode.cards_before_level_up>0){const index=Math.min(levels.length-1,Math.floor(session.resolvedCount/mode.cards_before_level_up));return levels[Math.max(0,index)]?.id??session.currentLevelId;}if(mode.slug==='clasico')return session.currentLevelId??levels[0]?.id??null;return null;}
function nextPlayer(current:0|1,mode:GameMode,random:()=>number):0|1{return mode.turn_mode==='random'?(random()<.5?0:1):(current===0?1:0);}
export interface DrawResult{session:SessionState;card:Card|null;exhausted:boolean;}

export function drawNextCard(content:ContentBundle,setup:GameSetup,session:SessionState,random:()=>number=Math.random):DrawResult{
 if(session.resolvedCount>=setup.maxCards)return{session,card:null,exhausted:true};const mode=content.modes.find(item=>item.id===setup.modeId)??content.modes[0];if(!mode)return{session,card:null,exhausted:true};
 const context=(player:0|1)=>({selectedLevelIds:new Set(setup.levelIds),selectedDeckIds:new Set(setup.deckIds),selectedElementIds:new Set(setup.elementIds),selectedToyIds:new Set(setup.toyIds),filters:setup.filters,currentPlayerSexId:player===0?setup.playerOneSexId:setup.playerTwoSexId,partnerSexId:player===0?setup.playerTwoSexId:setup.playerOneSexId});
 const target=targetLevelForDraw(content,setup,session,mode);let blocked=new Set(session.usedCardIds);let drawPlayer=session.currentPlayer;let allEligible:Card[]=[];let candidates:Card[]=[];
 const calculate=()=>{allEligible=eligibleCards(content,context(drawPlayer)).filter(card=>!blocked.has(card.id));candidates=target?allEligible.filter(card=>card.level===target):allEligible;if(!candidates.length&&mode.slug!=='solo-previa')candidates=allEligible;};calculate();
 if(!candidates.length){const other:0|1=drawPlayer===0?1:0;drawPlayer=other;calculate();}
 // Si el historial de partidas anteriores agotó el conjunto compatible, abre un ciclo nuevo sin olvidar las cartas ya vistas en esta sesión.
 if(!candidates.length&&session.usedCardIds.length){blocked=new Set([...session.completedCardIds,...session.skippedCardIds]);const {key}=historyContext(content,setup);resetCardHistory(key);drawPlayer=session.currentPlayer;calculate();if(!candidates.length){drawPlayer=drawPlayer===0?1:0;calculate();}}
 const pool=chooseInventoryPool(candidates,allEligible,content,setup,session);const card=weightedPick(pool,random);if(!card)return{session:{...session,currentCardId:null},card:null,exhausted:true};
 const {key,limit}=historyContext(content,setup);rememberCard(key,card.id,limit);return{session:{...session,currentPlayer:drawPlayer,currentCardId:card.id,currentLevelId:card.level,revealed:false,usedCardIds:[...blocked,card.id],timerStartedAt:null,timerRemaining:card.duration_seconds},card,exhausted:false};
}

export function resolveCurrentCard(content:ContentBundle,setup:GameSetup,session:SessionState,result:'completed'|'skipped',random:()=>number=Math.random):SessionState{if(!session.currentCardId)return session;const mode=content.modes.find(item=>item.id===setup.modeId)??content.modes[0];if(!mode)return session;return{...session,currentCardId:null,currentPlayer:nextPlayer(session.currentPlayer,mode,random),completedCardIds:result==='completed'?[...session.completedCardIds,session.currentCardId]:session.completedCardIds,skippedCardIds:result==='skipped'?[...session.skippedCardIds,session.currentCardId]:session.skippedCardIds,resolvedCount:session.resolvedCount+1,revealed:false,timerStartedAt:null,timerRemaining:null};}
export function previewEligibleCount(content:ContentBundle,setup:GameSetup):number{const common={selectedLevelIds:new Set(setup.levelIds),selectedDeckIds:new Set(setup.deckIds),selectedElementIds:new Set(setup.elementIds),selectedToyIds:new Set(setup.toyIds),filters:setup.filters};const one=eligibleCards(content,{...common,currentPlayerSexId:setup.playerOneSexId,partnerSexId:setup.playerTwoSexId});const two=eligibleCards(content,{...common,currentPlayerSexId:setup.playerTwoSexId,partnerSexId:setup.playerOneSexId});return new Set([...one,...two].map(card=>card.id)).size;}
