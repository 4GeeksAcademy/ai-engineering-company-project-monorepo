const extractOrderItemNamesFromString = (input: string): string[] => {
    const regex = /"([^"]+)"/g;
    const matches = input.match(regex);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
};

export default extractOrderItemNamesFromString;

