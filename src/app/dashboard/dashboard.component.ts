import { Component } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {combineLatest} from 'rxjs/internal/observable/combineLatest';
import {delay} from 'rxjs/operators';
const config = require('../../config.json');

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  public syncing = false;
  public showSyncModal = false;
  public createdGloBoard;
  public selectedSyncType;
  public selectedSyncBoard;
  public syncTypes = [
    {label: 'Trello', value: 'Trello'}
  ];
  public syncBoards;
  private auth_token;
  public token;
  public tokenModalDisplay = false;
  public addModalDisplay = false;
  private glo_user;
  private glo_boards;
  private trello_boards;
  public sync_user;
  private trello_user;
  public boards = [
    {
      'sync-type': 'Trello',
      'glo-board': 'Test',
      'trello-board': 'Fake Data',
      '2-way': 'No'
    }
  ];
  constructor(
    private http: HttpClient
  ) {

    this.auth_token = this.getCookie('auth_token');

    this.getUser();
    this.getBoards();
  }

  public toggleModalDisplay() {
    this.addModalDisplay = true;
    this.syncBoards = this.trello_boards;
    this.selectedSyncType = this.syncTypes[0];
    this.selectedSyncBoard = this.trello_boards[0];
  }

  private getCookie(name) {
    const value = '; ' + document.cookie;
    const parts = value.split('; ' + name + '=');
    if (parts.length === 2) { return parts.pop().split(';').shift(); }
  }
  private delete_cookie = function(name) {
    document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  };

  public getUser() {
    this.http.get(config.SERVER + ':5000/getUser?token=' + this.auth_token).subscribe(glo_user => {
      this.glo_user = glo_user;
      if (this.glo_user.message === 'Auth token not provided') {
        this.delete_cookie('auth_token');
        window.location.replace('/#/');
      } else {
        this.getSyncUser();
      }
    }, error => {
      this.delete_cookie('auth_token');
      window.location.replace('/#/');
    });
  }

  public getBoards() {
    this.http.get(config.SERVER + ':5000/getBoards?token=' + this.auth_token).subscribe(glo_boards => {
      this.glo_boards = glo_boards;
      if (this.glo_boards.message === 'Auth token not provided') {
        window.location.replace('/#/');
      }
    }, error => {
      window.location.replace('/#/');
    });
  }

  public getSyncUser() {
    this.http.get(config.SERVER + ':5000/getSyncUser?glo_id=' + this.glo_user.id).subscribe(sync_user => {
      this.sync_user = sync_user;
      console.log('sync user', this.sync_user);
      if (this.sync_user['trello_auth_token'] !== '') {
        this.getTrelloUser();
      } else {
        this.trello_user = null;
        this.trello_boards = null;
      }
    });
  }

  public authTrelloModal() {
    const win = window.open('https://trello.com/1/authorize' +
    '?expiration=never&name=Glo%20Sync&scope=read&response_type=token&key=269e3647ec6fc8ed96e374c2c7b016c6', '_blank');
    win.focus();
    this.tokenModalDisplay = true;
  }
  public submitTrelloModal() {
    this.http.get(config.SERVER + ':5000/setToken?type=trello&token=' + this.token + '&glo_id=' + this.glo_user.id).subscribe(res => {
      this.token = '';
      this.tokenModalDisplay = false;
      this.getSyncUser();
    });
  }
  private getTrelloUser() {
    this.http.get(config.SERVER + ':5000/getTrelloUser?token=' + this.sync_user['trello_auth_token']).subscribe(res => {
      console.log(res);
      this.trello_user = res;
      this.getTrelloBoards();
    });
  }
  private getTrelloBoards() {
    this.http.get(config.SERVER + ':5000/getTrelloBoards?trello_id=' + this.trello_user.id +
      '&token=' + this.sync_user['trello_auth_token']).subscribe(res => {
      console.log(res);
      this.trello_boards = res;
    });
  }

  public removeToken() {
    this.http.get(config.SERVER + ':5000/setToken?type=trello&token=&glo_id=' + this.glo_user.id).subscribe(res => {
      this.token = '';
      this.tokenModalDisplay = false;
      this.getSyncUser();
    });
  }


  public submitAddModal() {
    this.addModalDisplay = false;

    console.log('selected sync board', this.selectedSyncBoard);
    console.log('selected sync type', this.selectedSyncType);
    this.createBoard();
  }

  private createBoard() {
    console.log('creating board ' + this.selectedSyncBoard.name);
    const this1 = this;
    const convertedBoard = {
      name: this.selectedSyncBoard.name
    };
    this1.http.post(config.SERVER + ':5000/createBoard?token=' + this1.auth_token, convertedBoard).subscribe(createdBoardRes => {
      this.createdGloBoard = createdBoardRes;
      this.syncing = true;
      this.showSyncModal = true;
      this.beginCreateColumns();
    });
  }

  private beginCreateColumns() {
    this.http.get(config.SERVER + ':5000/getTrelloBoardList?board_id=' + this.selectedSyncBoard.id +
      '&token=' + this.sync_user['trello_auth_token']).subscribe(trelloBoardReturn => {
      console.log('columnCreateObjects', trelloBoardReturn);
      const columns = <any[]>trelloBoardReturn;
      const current = 0;
      const max = columns.length;
      const gloColumnIDs = [];
      if (max !== 0) {
        this.createColumns(gloColumnIDs, current, max, columns);
      } else {
        this.syncing = false;
      }
    });
  }

  private beginCreateCards(gloColumnIDs, columns) {
    columns.forEach(column => {
      const current = 0;
      const max = column.cards.length;
      const gloColumnID = gloColumnIDs[column.id];
      const gloCardIDs = [];
      if (max !== 0) {
        this.createCards(gloCardIDs, current, max, gloColumnID, column, columns);
      } else {
        this.syncing = false;
      }
    });
  }

  private beginCreateComments(gloCardIDs, columns) {
    columns.forEach(column => {
      column.cards.forEach(card => {

        this.http.get(config.SERVER + ':5000/getTrelloCardActions?token=' + this.sync_user['trello_auth_token'] + '&card_id=' +
          card.id).subscribe(actionsReturn => {

          const actions = <any[]>actionsReturn;

          if (Array.isArray(actions) && actions.length > 0) {
            const comments = actions.filter(comment => comment.type === 'commentCard' || comment.type === 'addAttachmentToCard');

            const gloCardID = gloCardIDs[card.id];
            const current = 0;
            const max = comments.length;
            if (max !== 0) {
              this.createComments(gloCardIDs, current, max, gloCardID, card, comments, columns);
            }
          } else {
            console.log('actions was not an array or was empty. Skipping.');
          }
        });
      });
    });
  }

  private createColumns(gloColumnIDs, current, max, columns) {
    console.log('column #', current + 1, 'out of', max);
    const this1 = this;
    const convertedColumn = {
      name: columns[current].name
    };
    this1.http.post(config.SERVER + ':5000/createColumn?token=' + this1.auth_token + '&boardId=' +
      this1.createdGloBoard.id, convertedColumn).subscribe(createdColumnRes => {
        const createdColumn = <any>createdColumnRes;
        gloColumnIDs[columns[current].id] = createdColumn.id;
        if (current < max - 1) {
          current++;
          this.createColumns(gloColumnIDs, current, max, columns);
        } else {
          this.beginCreateCards(gloColumnIDs, columns);
        }
    });
  }

  private createCards(gloCardIDs, current, max, gloColumnID, column, columns) {
    const this1 = this;
    const convertedCard = {
      name: column.cards[current].name,
      due_date: column.cards[current].due,
      description: {
        text: column.cards[current].desc
      },
      column_id: gloColumnID
    };
    this1.http.post(config.SERVER + ':5000/createCard?token=' + this1.auth_token + '&boardId=' +
      this1.createdGloBoard.id, convertedCard).subscribe(createdCardRes => {
      const createdCard = <any>createdCardRes;
      gloCardIDs[column.cards[current].id] = createdCard.id;
      if (current < max - 1) {
        current++;
        this.createCards(gloCardIDs, current, max, gloColumnID, column, columns);
      } else {
        this.beginCreateComments(gloCardIDs, columns);
      }
    });
  }

  private createComments(gloCardIDs, current, max, gloCardID, card, comments, columns) {
    let convertedComment;
    if (comments[current].type === 'commentCard') {
      convertedComment = {
        text: comments[current].data.text
      };
    }
    if (comments[current].type === 'addAttachmentToCard') {
      convertedComment = {
        text: '![image](' + comments[current].data.attachment.url + ')'
      };
    }
    this.http.post(config.SERVER + ':5000/createComment?token=' + this.auth_token + '&boardId=' +
      this.createdGloBoard.id + '&cardId=' + gloCardID, convertedComment).subscribe(createComment => {
      if (current < max - 1) {
        current++;
        this.createComments(gloCardIDs, current, max, gloCardID, card, comments, columns);
      } else {
        this.syncing = false;
      }
    });
  }
}
