import FourthPhaseLab from './components/fourthPhase/FourthPhaseLab';

// Fourth Phase is the app front door. The Callsmith/Gridiron season game
// (FootballHome / FootballSeason / footballRogue ...) is no longer wired into
// the app; that code is retained in git history and still has its own
// verification scripts (smoke:gridiron, matchup:gridiron, balance:gridiron).
export default function App() {
  return <FourthPhaseLab />;
}
