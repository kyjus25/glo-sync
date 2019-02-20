import { Component } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {combineLatest} from 'rxjs/internal/observable/combineLatest';
import {delay} from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  private totalColumnCreateCount: number;
  private columnCreateCount: number;
  private columnCreateObjects;
  private totalCardCreateCount: number;
  private cardCreateCount: number;
  private cardCreateObjects;

  public selectedGloBoard;
  public selectedSyncType;
  public selectedSyncBoard;
  public emptyGloBoards;
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
      'sync-type': 'trello',
      'glo-board': 'jira-tool',
      'trello-board': 'fake101'
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
    this.selectedGloBoard = this.emptyGloBoards[0];
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
    this.http.get('http://localhost:5000/getUser?token=' + this.auth_token).subscribe(glo_user => {
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
    this.http.get('http://localhost:5000/getBoards?token=' + this.auth_token).subscribe(glo_boards => {
      this.glo_boards = glo_boards;
      if (this.glo_boards.message === 'Auth token not provided') {
        window.location.replace('/#/');
      } else {
        this.getEmptyBoards();
      }
    }, error => {
      window.location.replace('/#/');
    });
  }

  public getEmptyBoards() {
    this.emptyGloBoards = this.glo_boards.filter(board => board.columns.length === 0);
    console.log(this.emptyGloBoards);
  }

  public getSyncUser() {
    this.http.get('http://localhost:5000/getSyncUser?glo_id=' + this.glo_user.id).subscribe(sync_user => {
      this.sync_user = sync_user;
      console.log(this.sync_user);
      if (this.sync_user['trello_auth_token'] !== '') {
        this.getTrelloUser();
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
    this.http.get('http://localhost:5000/setToken?type=trello&token=' + this.token + '&glo_id=' + this.glo_user.id).subscribe(res => {
      this.token = '';
      this.tokenModalDisplay = false;
    });
  }
  private getTrelloUser() {
    this.http.get('http://localhost:5000/getTrelloUser?token=' + this.sync_user['trello_auth_token']).subscribe(res => {
      console.log(res);
      this.trello_user = res;
      this.getTrelloBoards();
    });
  }
  private getTrelloBoards() {
    this.http.get('http://localhost:5000/getTrelloBoards?trello_id=' + this.trello_user.id +
      '&token=' + this.sync_user['trello_auth_token']).subscribe(res => {
      console.log(res);
      this.trello_boards = res;
    });
  }


  public submitAddModal() {
    console.log('selected sync board', this.selectedSyncBoard);
    console.log('selected glo board', this.selectedGloBoard);
    console.log('selected sync type', this.selectedSyncType);

    // Get Trello board information (columns and cards)
    this.http.get('http://localhost:5000/getTrelloBoardList?board_id=' + this.selectedSyncBoard.id +
      '&token=' + this.sync_user['trello_auth_token']).subscribe(trelloBoardReturn => {
      console.log(trelloBoardReturn);
      this.columnCreateObjects = <any[]>trelloBoardReturn;
      this.columnCreateCount = 0;
      this.totalColumnCreateCount = this.columnCreateObjects.length - 1;
      // Create the columns in glo
      if (this.totalColumnCreateCount !== 0) {
        this.createColumn(this.columnCreateCount);
      }
    });
  }

  public createColumn(iteration) {
    // console.log('column #', this.columnCreateCount, 'out of', this.totalColumnCreateCount);
    const this1 = this;
    const convertedColumn = {
      name: this.columnCreateObjects[iteration].name
    };
    this1.http.post('http://localhost:5000/createColumn?token=' + this1.auth_token + '&boardId=' +
      this1.selectedGloBoard.id, convertedColumn).subscribe(createCol => {
        this.cardCreateObjects = this.columnCreateObjects[iteration].cards;
        this.cardCreateCount = 0;
        this.totalCardCreateCount = this.columnCreateObjects[iteration].cards.length - 1;
        if (this.cardCreateCount <= this.totalCardCreateCount) {
          this.createCard(createCol);
        } else {
          this.columnCreateCount++;
          this.createColumn(this.columnCreateCount);
        }
    });
  }

  public createCard(currentColumn) {
    const this1 = this;
    // console.log('column #', this.columnCreateCount);
    // console.log('card #', this.cardCreateCount, 'out of', this.totalCardCreateCount);
    // console.log(this.columnCreateObjects[this.columnCreateCount].name);
    // console.log(this.columnCreateObjects[this.columnCreateCount].cards[this.cardCreateCount].name);

    const date = new Date(this.columnCreateObjects[this.columnCreateCount].cards[this.cardCreateCount].due);
    const stringDate = (date.getMonth() + 1) + '/' + date.getDate() + '/' +  date.getFullYear();
    const convertedCard = {
      name: this.columnCreateObjects[this.columnCreateCount].cards[this.cardCreateCount].name,
      due_date: this.columnCreateObjects[this.columnCreateCount].cards[this.cardCreateCount].due,
      description: {
        text: this.columnCreateObjects[this.columnCreateCount].cards[this.cardCreateCount].desc
      },
      column_id: currentColumn.id
    };
    this1.http.post('http://localhost:5000/createCard?token=' + this1.auth_token + '&boardId=' +
      this1.selectedGloBoard.id, convertedCard).subscribe(createCard => {
        const createdCard = <any>createCard;



      this1.http.get('http://localhost:5000/getTrelloCardActions?token=' + this.sync_user['trello_auth_token'] + '&card_id=' +
        this.columnCreateObjects[this.columnCreateCount].cards[this.cardCreateCount].id).subscribe(actionsReturn => {
        const actions = <any[]>actionsReturn;
        actions.filter(comment => comment.type === 'commentCard').forEach(comment => {
          console.log('comment', comment.data.text);
          const convertedComment = {
            text: comment.data.text
          };
          this1.http.post('http://localhost:5000/createComment?token=' + this1.auth_token + '&boardId=' +
            this1.selectedGloBoard.id + '&cardId=' + createdCard.id, convertedComment).subscribe(createComment => {
          });
        });
      });



      if (this.cardCreateCount < this.totalCardCreateCount) {
        this.cardCreateCount++;
        this.createCard(currentColumn);
      } else {
        // console.log('end of this column ^');
        if (this.columnCreateCount < this.totalColumnCreateCount) {
          this.columnCreateCount++;
          this.createColumn(this.columnCreateCount);
        }
      }
    });
  }
}
