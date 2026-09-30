import { DEMO_GAMES, demoTable, textCell } from "../../../gallery/demoTable";
import type { GalleryModule } from "../../../gallery/types";
import WithState from "../../../gallery/WithState";
import PickCell from "./PickCell";

const gallery: GalleryModule = {
  section: "tables",
  title: "PickCell",
  demos: [
    {
      name: "A pick per row (the row's own click never fires from it)",
      render: () => (
        <WithState initial={new Set<string>(["g2"])}>
          {(picked, setPicked) =>
            demoTable(
              <>
                {textCell("")}
                {textCell("White")}
              </>,
              DEMO_GAMES.map((game) => (
                <>
                  <PickCell
                    checked={picked.has(game.id)}
                    label={`Pick ${game.white}`}
                    testId={`gallery-pick-${game.id}`}
                    onToggle={() =>
                      setPicked((before) => {
                        const next = new Set(before);
                        if (next.has(game.id)) next.delete(game.id);
                        else next.add(game.id);
                        return next;
                      })
                    }
                  />
                  {textCell(game.white)}
                </>
              )),
            )
          }
        </WithState>
      ),
    },
  ],
};

export default gallery;
