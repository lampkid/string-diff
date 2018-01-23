/*

class.Diff.js

A class containing a diff implementation

Created by Stephen Morley - http://stephenmorley.org/ - and released under the
terms of the CC0 1.0 Universal legal code:

http://creativecommons.org/publicdomain/zero/1.0/legalcode

*/

// A class containing functions for computing diffs and formatting the output.
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


class Diff
{

    // define the constants
    static DIFIED = 0;
    static DELETED = 1;
    static INSERTED = 2;

    /* Returns the diff for two strings. The return value is an array, each of
     * whose values is an array containing two values: a line (or character, if
     * $compareCharacters is true), and one of the constants DIFF::DIFIED (the
     * line or character is in both strings), DIFF::DELETED (the line or character
     * is only in the first string), and DIFF::INSERTED (the line or character is
     * only in the second string). The parameters are:
     *
     * $string1           - the first string
     * $string2           - the second string
     * $compareCharacters - true to compare characters, and false to compare
     *                      lines; this optional parameter defaults to false
     */
    static compare(
        string1, string2, compareCharacters = false)
    {

        // initialise the sequences and comparison start and end positions
        let start = 0,
            sequence1, sequence2,
            end1, end2;
        if (compareCharacters) {
            sequence1 = string1;
            sequence2 = string2;
            end1 = string1.length - 1;
            end2 = string2.length - 1;
        } else {
            sequence1 = string1.split(/\n/);
            sequence2 = string2.split(/\n/);
            end1 = sequence1.length - 1;
            end2 = sequence2.length - 1;
        }

        // skip any common prefix
        while (start <= end1 && start <= end2
            && sequence1[start] == sequence2[start]) {
            start++;
        }

        // skip any common suffix
        while (end1 >= start && end2 >= start
            && sequence1[end1] == sequence2[end2]) {
            end1--;
            end2--;
        }

        // compute the table of longest common subsequence lengths
        const table = Diff.computeTable(sequence1, sequence2, start, end1, end2);


        // generate the partial diff
        const partialDiff =
            Diff.generatePartialDiff(table, sequence1, sequence2, start);

        // generate the full diff
        let diff = [];
        for (let index = 0; index < start; index++) {
            diff.push([sequence1[index], Diff.DIFIED]);
        }
        while (partialDiff.length > 0) diff.push(partialDiff.pop());
        for (let index = end1 + 1;
             index < (compareCharacters ? string1.length : sequence1.length);
             index++) {
            diff.push([sequence1[index], Diff.DIFIED]);
        }

        // return the diff
        return diff;

    }

    /* Returns the diff for two files. The parameters are:
     *
     * $file1             - the path to the first file
     * $file2             - the path to the second file
     * $compareCharacters - true to compare characters, and false to compare
     *                      lines; this optional parameter defaults to false
     */
    static compareString(
        file1, file2, compareCharacters = false)
    {

        // return the diff of the files
        return Diff.compare(
            file1, file2,
            compareCharacters);

    }

    static compareJsonString(string1, string2, compareCharacters = false)
    {
        try {
            string1 = !!(string1) ? JSON.stringify(JSON.parse(string1), null, 2) : '';
            string2 = !!(string2) ? JSON.stringify(JSON.parse(string2), null, 2) : '';
        }
        catch(e) {
            console.warn('JSON format error:', string1, string2);
        }
        // return the diff of the files
        return Diff.compare(string1, string2, compareCharacters);
    }

    /* Returns the table of longest common subsequence lengths for the specified
     * sequences. The parameters are:
     *
     * $sequence1 - the first sequence
     * $sequence2 - the second sequence
     * $start     - the starting index
     * $end1      - the ending index for the first sequence
     * $end2      - the ending index for the second sequence
     */
    static computeTable(
        sequence1, sequence2, start, end1, end2)
    {

        // determine the lengths to be compared
        const length1 = end1 - start + 1;
        const length2 = end2 - start + 1;

        // initialise the table
        let table = [new Array(length2 + 1).fill(0)];

        // loop over the rows
        for (let index1 = 1; index1 <= length1; index1++) {

            // create the new row
            table[index1] = [0];

            // loop over the columns
            for (let index2 = 1; index2 <= length2; index2++) {

                // store the longest common subsequence length
                if (sequence1[index1 + start - 1]
                    == sequence2[index2 + start - 1]
                ) {
                    table[index1][index2] = table[index1 - 1][index2 - 1] + 1;
                } else {
                    table[index1][index2] =
                        Math.max(table[index1 - 1][index2], table[index1][index2 - 1]);
                }

            }
        }

        // return the table
        return table;

    }

    /* Returns the partial diff for the specificed sequences, in reverse order.
     * The parameters are:
     *
     * $table     - the table returned by the computeTable function
     * $sequence1 - the first sequence
     * $sequence2 - the second sequence
     * $start     - the starting index
     */
    static generatePartialDiff(
        table, sequence1, sequence2, start)
    {

        //  initialise the diff
        let diff = [];

        // initialise the indices
        let index1 = table.length - 1;
        let index2 = table[0].length - 1;

        // loop until there are no items remaining in either sequence
        while (index1 > 0 || index2 > 0) {

            // check what has happened to the items at these indices
            if (index1 > 0 && index2 > 0
                && sequence1[index1 + start - 1]
                == sequence2[index2 + start - 1]
            ) {

                // update the diff and the indices
                diff.push([sequence1[index1 + start - 1], Diff.DIFIED]);
                index1--;
                index2--;

            } else if (index2 > 0
                && table[index1][index2] == table[index1][index2 - 1]
            ) {

                // update the diff and the indices
                diff.push([sequence2[index2 + start - 1], Diff.INSERTED]);
                index2--;

            } else {

                // update the diff and the indices
                diff.push([sequence1[index1 + start - 1], Diff.DELETED]);
                index1--;

            }

        }

        // return the diff
        return diff;

    }

    /* Returns a diff as a string, where unmodified lines are prefixed by '  ',
     * deletions are prefixed by '- ', and insertions are prefixed by '+ '. The
     * parameters are:
     *
     * $diff      - the diff array
     * $separator - the separator between lines; this optional parameter defaults
     *              to "\n"
     */
    toString(diff, separator = "\n")
    {

        // initialise the string
        let string = '';

        // loop over the lines in the diff
        diff.forEach((line) => {

            // extend the string with the line
            switch (line[1]) {
                case Diff.DIFIED :
                    string += '  ' + line[0];
                    break;
                case Diff.DELETED    :
                    string += '- ' + line[0];
                    break;
                case Diff.INSERTED   :
                    string += '+ ' + line[0];
                    break;
            }

            // extend the string with the separator
            string += separator;

        });

        // return the string
        return string;

    }

    /* Returns a diff as an HTML string, where unmodified lines are contained
     * within 'span' elements, deletions are contained within 'del' elements, and
     * insertions are contained within 'ins' elements. The parameters are:
     *
     * $diff      - the diff array
     * $separator - the separator between lines; this optional parameter defaults
     *              to '<br>'
     */
    static toHTML(diff, separator = '<br>')
    {

        // initialise the HTML
        let html = '';

        // loop over the lines in the diff
        diff.forEach((line) => {

            // extend the HTML with the line
            switch (line[1]) {
                case Diff.DIFIED :
                    element = 'span';
                    break;
                case Diff.DELETED    :
                    element = 'del';
                    break;
                case Diff.INSERTED   :
                    element = 'ins';
                    break;
            }
            html +=
                ['<', element, '>', 
                    escapeHtml(line[0]),
                 '</' , element , '>'].join('');

            // extend the HTML with the separator
            html += separator;

        });

        // return the HTML
        return html;

    }

    /* Returns a diff as an HTML table. The parameters are:
     *
     * $diff        - the diff array
     * $indentation - indentation to add to every line of the generated HTML; this
     *                optional parameter defaults to ''
     * $separator   - the separator between lines; this optional parameter
     *                defaults to '<br>'
     */
    static toTable(diff, indentation = '', separator = '<br>')
    {

        // initialise the HTML
        let html = indentation + "<table class=\"diff\">\n";

        // loop over the lines in the diff
        let index = 0, leftCellObj, rightCellObj;
        const diffLength = diff.length;
        while (index < diffLength) {

            let innerIndex;
            // determine the line type
            switch (diff[index][1]) {

                // display the content on the left and right
                case Diff.DIFIED:
                    leftCellObj =
                        Diff.getCellContent(
                            diff, indentation, separator, index, Diff.DIFIED);
                    rightCellObj = leftCellObj;
                    break;

                // display the deleted on the left and inserted content on the right
                case Diff.DELETED:
                    leftCellObj = Diff.getCellContent(
                            diff, indentation, separator, index, Diff.DELETED);

                    rightCellObj =
                        Diff.getCellContent(
                            diff, indentation, separator, leftCellObj.index || index, Diff.INSERTED);
                    break;

                // display the inserted content on the right
                case Diff.INSERTED:
                    leftCellObj = {html: '', index};
                    rightCellObj =
                        Diff.getCellContent(
                            diff, indentation, separator, index, Diff.INSERTED);
                    break;

            }

            const {html: leftCell, index:leftIndex} = leftCellObj;
            const {html: rightCell, index: rightIndex} = rightCellObj;


            // extend the HTML with the new row
            html += [
                indentation,
                 "  <tr>\n",
                indentation,
                '    <td class="diff-left diff',
                (leftCell == rightCell
                    ? 'Unmodified'
                    : (leftCell == '' ? 'Blank' : 'Deleted')),
                 '">',
                leftCell,
                "</td>\n",
                indentation,
                '    <td class="diff-right diff',
                (leftCell == rightCell
                    ? 'Unmodified'
                    : (rightCell == '' ? 'Blank' : 'Inserted')),
                '">',
                rightCell,
                "</td>\n",
                indentation,
                "  </tr>\n"].join('');

            index = Math.max(leftIndex, rightIndex);
        }

        // return the HTML
        return html + indentation + "</table>\n";

    }

    /* Returns the content of the cell, for use in the toTable function. The
     * parameters are:
     *
     * $diff        - the diff array
     * $indentation - indentation to add to every line of the generated HTML
     * $separator   - the separator between lines
     * $index       - the current index, passes by reference
     * $type        - the type of line
     */
    static getCellContent(
        diff, indentation, separator, index, type)
    {

        // initialise the HTML
        let html = '';

        // loop over the matching lines, adding them to the HTML
        while (index < diff.length && diff[index][1] == type) {
            html +=
                '<span>'
                + escapeHtml(diff[index][0])
                + '</span>'
                + separator;
            index++;
        }

        // return the HTML
        return {html, index};

    }

}

export default Diff;
