import argparse
import sys

from pathlib import Path


ROOT = (
    Path(__file__)
    .resolve()
    .parents[1]
)


sys.path.insert(
    0,
    str(ROOT),
)


from packages.incidents_analysis import (
    analyze_csv_text,
    format_summary,
    summary_to_csv,
)


def main():

    parser = argparse.ArgumentParser(
        description=(
            "Analiza el CSV de "
            "incidencias de trackflow."
        )
    )


    parser.add_argument(
        "csv_file",
        help=(
            "Ruta al fichero CSV "
            "que se quiere analizar."
        ),
    )


    args = parser.parse_args()

    csv_path = Path(
        args.csv_file
    )


    if not csv_path.exists():

        print(
            "Error: no existe "
            f"el fichero {csv_path}"
        )

        sys.exit(1)


    try:

        text = (
            csv_path.read_text(
                encoding="utf-8-sig"
            )
        )


        summary = (
            analyze_csv_text(
                text=text,
                source_file=(
                    csv_path.name
                ),
            )
        )


    except (
        OSError,
        UnicodeDecodeError,
        ValueError,
    ) as error:

        print(
            f"Error: {error}"
        )

        sys.exit(1)


    print()

    print(
        format_summary(
            summary
        )
    )

    print()


    answer = input(
        "¿Deseas exportar "
        "los resultados a CSV? "
        "[s / n]: "
    ).strip().lower()


    if answer in {
        "s",
        "si",
        "sí",
        "y",
        "yes",
    }:

        result_path = Path(
            "results.csv"
        )


        result_path.write_text(

            summary_to_csv(
                summary
            ),

            encoding="utf-8",

        )


        print(
            "Resultados guardados en "
            f"{result_path.resolve()}"
        )


    else:

        print(
            "Resultados no exportados."
        )


if __name__ == "__main__":
    main()
