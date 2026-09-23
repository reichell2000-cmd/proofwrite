import { Extension, getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TextStyle from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
const Layout = Extension.create({
  name: "layout",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (e) => e.style.fontSize,
            renderHTML: (a) =>
              a.fontSize ? { style: `font-size: ${a.fontSize}` } : {},
          },
        },
      },
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (e) => Number(e.getAttribute("data-indent") || 0),
            renderHTML: (a) => ({
              "data-indent": a.indent,
              style: `margin-left: ${Math.min(5, Math.max(0, Number(a.indent) || 0)) * 1.5}em`,
            }),
          },
        },
      },
    ];
  },
});
export const extensions = () => [
  StarterKit,
  Underline,
  Link.configure({
    openOnClick: false,
    autolink: false,
    protocols: ["https", "http"],
  }),
  Image.configure({ allowBase64: true }),
  Table.configure({ resizable: false }),
  TableRow,
  TableHeader,
  TableCell,
  TextStyle,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  Layout,
];
export const schema = getSchema(extensions());
